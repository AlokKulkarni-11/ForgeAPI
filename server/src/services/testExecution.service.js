const { randomUUID } = require('crypto');
const axios = require('axios');

const ALLOWED_TEST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function buildSampleValue(field = {}) {
  switch (field.type) {
    case 'number':
      return 42;
    case 'boolean':
      return true;
    case 'date':
      return new Date().toISOString();
    case 'uuid':
      return randomUUID();
    default:
      return field.name ? `${field.name}-sample` : 'sample';
  }
}

function buildSampleBody(endpoint = {}, entities = []) {
  const targetEntity =
    entities.find((entity) => entity.name === endpoint.entity) ||
    entities.find((entity) =>
      String(endpoint.path || '')
        .toLowerCase()
        .includes(`/${String(entity.name || '').toLowerCase()}s`),
    );

  if (!targetEntity || !Array.isArray(targetEntity.fields)) {
    return { name: 'sample-name' };
  }

  return targetEntity.fields.reduce((acc, field) => {
    if (field.name === 'id') {
      return acc;
    }

    acc[field.name] = buildSampleValue(field);
    return acc;
  }, {});
}

function extractEntityKey(endpoint = {}) {
  if (endpoint.entity) {
    return String(endpoint.entity).toLowerCase();
  }

  const match = String(endpoint.path || '').match(/^\/([^/]+)/);
  return match ? match[1].replace(/s$/, '').toLowerCase() : 'resource';
}

function extractRecordId(data) {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return data.id || data._id || data.uuid || null;
}

function replacePathId(path = '/', id) {
  return String(path || '/')
    .replace(/:id\b/g, id)
    .replace(/\{id\}/gi, id);
}

function buildRequestUrl(baseUrl, requestPath = '/') {
  const normalizedBaseUrl = String(baseUrl || '').trim();
  const normalizedRequestPath = String(requestPath || '/').trim();

  if (/^https?:\/\//i.test(normalizedRequestPath)) {
    return normalizedRequestPath;
  }

  const base = new URL(normalizedBaseUrl);
  const requestTarget = new URL(
    normalizedRequestPath.startsWith('/') ? normalizedRequestPath : `/${normalizedRequestPath}`,
    'http://forgeapi.local',
  );
  const basePath = base.pathname.replace(/\/+$/, '');
  const requestPathname = requestTarget.pathname.startsWith('/')
    ? requestTarget.pathname
    : `/${requestTarget.pathname}`;

  base.pathname = basePath ? `${basePath}${requestPathname}` : requestPathname;
  base.search = requestTarget.search;
  base.hash = requestTarget.hash;

  return base.toString();
}

async function executeTestRequest({ baseUrl, method = 'GET', path = '/', headers = {}, body }) {
  const normalizedMethod = String(method).toUpperCase();
  const targetUrl = buildRequestUrl(baseUrl, path);
  const startedAt = Date.now();
  const response = await axios.request({
    url: targetUrl,
    method: normalizedMethod,
    headers,
    data: ['GET', 'HEAD'].includes(normalizedMethod) ? undefined : body,
    timeout: 15000,
    validateStatus: () => true,
  });
  const durationMs = Date.now() - startedAt;

  return {
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    statusText: response.statusText,
    durationMs,
    headers: response.headers,
    data: response.data,
    request: {
      method: normalizedMethod,
      url: targetUrl,
      path: new URL(targetUrl).pathname,
    },
  };
}

async function ensureEntityRecord(baseUrl, endpoint, endpoints, entities, headers, entityState) {
  const entityKey = extractEntityKey(endpoint);

  if (entityState.get(entityKey)) {
    return entityState.get(entityKey);
  }

  const createEndpoint =
    endpoints.find(
      (item) =>
        String(item.method).toUpperCase() === 'POST' &&
        extractEntityKey(item) === entityKey,
    ) || {
      method: 'POST',
      path: `/${entityKey}s`,
      entity: endpoint.entity,
      operation: 'create',
    };

  const createResult = await executeTestRequest({
    baseUrl,
    method: 'POST',
    path: createEndpoint.path,
    headers,
    body: buildSampleBody(createEndpoint, entities),
  });

  const recordId = extractRecordId(createResult.data);
  const recordState = {
    id: recordId,
    bootstrapOk: createResult.ok,
    result: createResult,
  };

  entityState.set(entityKey, recordState);
  return recordState;
}

async function runEndpointTestSuite({ baseUrl, headers = {}, endpoints = [], entities = [] }) {
  const results = [];
  const entityState = new Map();

  for (const endpoint of endpoints) {
    const endpointMethod = String(endpoint.method || 'GET').toUpperCase();

    if (!ALLOWED_TEST_METHODS.includes(endpointMethod)) {
      continue;
    }

    const needsExistingRecord =
      /:id\b|\{id\}/i.test(String(endpoint.path || '')) &&
      ['GET', 'PUT', 'PATCH', 'DELETE'].includes(endpointMethod);

    let resolvedPath = endpoint.path || '/';
    let bootstrapFailure = null;

    if (needsExistingRecord) {
      const recordState = await ensureEntityRecord(
        baseUrl,
        endpoint,
        endpoints,
        entities,
        headers,
        entityState,
      );

      if (!recordState.bootstrapOk || !recordState.id) {
        bootstrapFailure = recordState.result;
      } else {
        resolvedPath = replacePathId(resolvedPath, recordState.id);
      }
    }

    if (bootstrapFailure) {
      results.push({
        ...bootstrapFailure,
        ok: false,
        endpoint: {
          method: endpointMethod,
          path: endpoint.path || '/',
          operation: endpoint.operation || null,
        },
      });
      continue;
    }

    const body =
      ['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes(endpointMethod)
        ? undefined
        : buildSampleBody(endpoint, entities);

    const result = await executeTestRequest({
      baseUrl,
      method: endpointMethod,
      path: resolvedPath,
      headers,
      body,
    });

    if (endpointMethod === 'POST' && result.ok) {
      const entityKey = extractEntityKey(endpoint);
      const createdId = extractRecordId(result.data);

      if (createdId) {
        entityState.set(entityKey, { id: createdId, bootstrapOk: true, result });
      }
    }

    if (endpointMethod === 'DELETE' && result.ok) {
      entityState.delete(extractEntityKey(endpoint));
    }

    results.push({
      ...result,
      endpoint: {
        method: endpointMethod,
        path: endpoint.path || '/',
        operation: endpoint.operation || null,
      },
    });
  }

  return results;
}

module.exports = {
  ALLOWED_TEST_METHODS,
  buildSampleBody,
  buildRequestUrl,
  executeTestRequest,
  runEndpointTestSuite,
};
