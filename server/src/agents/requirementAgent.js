const { model } = require('../config/ai');
const { inferApiDesign } = require('../services/specInference.service');

const SYSTEM_PROMPT = `You are a backend API specification expert. You receive a structured user input describing their API requirements (entities, fields, endpoints, auth, validation). Your job is to output a clean, complete JSON specification that will be used to generate production-ready REST API code.

Output ONLY valid JSON. No explanations, no markdown code blocks, no extra text.

The JSON must follow this exact schema:
{
  "apiName": "string",
  "description": "string",
  "entities": [{"name": "string", "tableName": "string", "fields": [{"name": "string", "type": "string", "required": boolean, "unique": boolean}]}],
  "endpoints": [{"method": "GET|POST|PUT|DELETE", "path": "string", "entity": "string", "operation": "list|get|create|update|delete", "auth": boolean, "description": "string"}],
  "auth": {"type": "none|jwt|apikey", "secretKey": "JWT_SECRET"},
  "validation": [{"entity": "string", "field": "string", "rules": ["string"]}],
  "framework": "string",
  "database": "string"
}`;

const stripCodeFences = (text) => {
  if (text.startsWith('```json')) {
    return text.slice(7, -3).trim();
  }

  if (text.startsWith('```')) {
    return text.slice(3, -3).trim();
  }

  return text;
};

const pluralize = (value = 'resource') => {
  const base = String(value || 'resource').trim().toLowerCase();
  if (!base) {
    return 'resources';
  }

  return base.endsWith('s') ? base : `${base}s`;
};

const inferOperation = (method = 'GET', path = '/') => {
  const normalizedMethod = String(method).toUpperCase();
  const hasIdSegment = /:id\b|\{id\}/i.test(path);

  if (normalizedMethod === 'GET' && hasIdSegment) {
    return 'get';
  }

  if (normalizedMethod === 'GET') {
    return 'list';
  }

  if (normalizedMethod === 'POST') {
    return 'create';
  }

  if (normalizedMethod === 'PUT' || normalizedMethod === 'PATCH') {
    return 'update';
  }

  if (normalizedMethod === 'DELETE') {
    return 'delete';
  }

  return 'custom';
};

const buildFallbackSpec = (requirements = {}, userConfig = {}, rawText = '', errorMessage = '') => {
  const inferred = inferApiDesign(requirements);
  const entities = inferred.entities;
  const endpoints = inferred.endpoints;
  const authType = requirements.auth_type || userConfig.authType || 'none';

  return {
    apiName: requirements.name || 'Generated API',
    description: requirements.description || requirements.raw_prompt || 'API generated from ForgeAPI requirements',
    entities: entities.map((entity) => ({
      name: entity.name || 'Resource',
      tableName: pluralize(entity.name || 'resource'),
      fields: Array.isArray(entity.fields)
        ? entity.fields.map((field) => ({
            name: field.name || 'name',
            type: field.type || 'string',
            required: Boolean(field.required),
            unique: Boolean(field.unique),
          }))
        : [],
    })),
    endpoints: endpoints.map((endpoint) => ({
      method: String(endpoint.method || 'GET').toUpperCase(),
      path: endpoint.path || '/',
      entity: endpoint.entity || requirements.entities?.[0]?.name || 'Resource',
      operation: endpoint.operation || inferOperation(endpoint.method, endpoint.path),
      auth: endpoint.auth ?? authType !== 'none',
      description: endpoint.description || `${String(endpoint.method || 'GET').toUpperCase()} ${endpoint.path || '/'}`,
    })),
    auth: {
      type: authType,
      secretKey: 'JWT_SECRET',
    },
    validation: Array.isArray(requirements.validation_rules) ? requirements.validation_rules : [],
    framework: userConfig.framework || requirements.framework || 'nodejs',
    database: userConfig.database || requirements.database_type || 'postgresql',
    __forgeMeta: {
      fallbackUsed: true,
      reason: errorMessage || 'Requirement agent output could not be parsed',
      rawOutputPreview: rawText.slice(0, 4000),
    },
  };
};

const run = async (requirements, userConfig) => {
  const prompt = `${SYSTEM_PROMPT}\n\nUSER INPUT:\nRequirements: ${JSON.stringify(requirements)}\nUser Config: ${JSON.stringify(userConfig)}`;
  const authType = requirements.auth_type || userConfig.authType || 'none';

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();
    const text = stripCodeFences(rawText);

    try {
      const parsed = JSON.parse(text);
      const inferred = inferApiDesign({
        ...requirements,
        entities: parsed.entities,
        endpoints: parsed.endpoints,
      });

      return {
        ...parsed,
        entities: inferred.entities.map((entity) => ({
          name: entity.name,
          tableName: pluralize(entity.name || 'resource'),
          fields: Array.isArray(entity.fields)
            ? entity.fields.map((field) => ({
                name: field.name || 'name',
                type: field.type || 'string',
                required: Boolean(field.required),
                unique: Boolean(field.unique),
              }))
            : [],
        })),
        endpoints: inferred.endpoints.map((endpoint) => ({
          method: String(endpoint.method || 'GET').toUpperCase(),
          path: endpoint.path || '/',
          entity: endpoint.entity || inferred.entities?.[0]?.name || 'Resource',
          operation: endpoint.operation || inferOperation(endpoint.method, endpoint.path),
          auth: endpoint.auth ?? authType !== 'none',
          description:
            endpoint.description ||
            `${String(endpoint.method || 'GET').toUpperCase()} ${endpoint.path || '/'}`,
        })),
      };
    } catch (parseError) {
      console.error('Failed to parse requirement JSON');
      return buildFallbackSpec(requirements, userConfig, rawText, parseError.message);
    }
  } catch (agentError) {
    console.error('Requirement agent request failed:', agentError);
    return buildFallbackSpec(
      requirements,
      userConfig,
      '',
      agentError.message || 'Requirement agent request failed',
    );
  }
};

module.exports = { run };
