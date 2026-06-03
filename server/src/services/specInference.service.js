const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'api',
  'app',
  'application',
  'backend',
  'build',
  'by',
  'for',
  'from',
  'have',
  'i',
  'in',
  'is',
  'it',
  'manage',
  'need',
  'of',
  'or',
  'platform',
  'system',
  'that',
  'the',
  'to',
  'with',
]);

const COMMON_ENTITY_ALIASES = [
  'user',
  'product',
  'order',
  'payment',
  'invoice',
  'customer',
  'cart',
  'item',
  'task',
  'project',
  'ticket',
  'comment',
  'message',
  'post',
  'blog',
  'book',
  'author',
  'student',
  'teacher',
  'course',
  'employee',
  'company',
  'vendor',
  'shipment',
  'booking',
  'appointment',
  'review',
  'category',
  'subscription',
  'report',
  'notification',
];

function normalizeEntityName(value = 'Resource') {
  const cleaned = String(value || 'Resource')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'Resource';
  }

  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join('');
}

function slugify(value = 'resource') {
  return String(value || 'resource')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'resource';
}

function pluralize(value = 'resource') {
  const base = slugify(value);

  if (base.endsWith('ies')) {
    return base;
  }

  if (base.endsWith('y')) {
    return `${base.slice(0, -1)}ies`;
  }

  if (base.endsWith('s')) {
    return base;
  }

  return `${base}s`;
}

function defaultFieldsForEntity(entityName) {
  const key = slugify(entityName);

  const presets = {
    appointment: [
      { name: 'title', type: 'string', required: true },
      { name: 'scheduledAt', type: 'date', required: true },
      { name: 'status', type: 'string', required: true },
    ],
    author: [
      { name: 'name', type: 'string', required: true },
      { name: 'bio', type: 'string', required: false },
    ],
    booking: [
      { name: 'referenceCode', type: 'string', required: true },
      { name: 'status', type: 'string', required: true },
      { name: 'scheduledAt', type: 'date', required: false },
    ],
    book: [
      { name: 'title', type: 'string', required: true },
      { name: 'author', type: 'string', required: true },
      { name: 'isbn', type: 'string', required: false },
    ],
    cart: [
      { name: 'userId', type: 'uuid', required: true },
      { name: 'status', type: 'string', required: true },
    ],
    comment: [
      { name: 'content', type: 'string', required: true },
      { name: 'authorId', type: 'uuid', required: false },
    ],
    company: [
      { name: 'name', type: 'string', required: true },
      { name: 'industry', type: 'string', required: false },
    ],
    course: [
      { name: 'title', type: 'string', required: true },
      { name: 'code', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
    ],
    customer: [
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'phone', type: 'string', required: false },
    ],
    employee: [
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'role', type: 'string', required: false },
    ],
    invoice: [
      { name: 'invoiceNumber', type: 'string', required: true },
      { name: 'amount', type: 'number', required: true },
      { name: 'status', type: 'string', required: true },
    ],
    item: [
      { name: 'name', type: 'string', required: true },
      { name: 'quantity', type: 'number', required: true },
      { name: 'price', type: 'number', required: false },
    ],
    message: [
      { name: 'subject', type: 'string', required: true },
      { name: 'content', type: 'string', required: true },
      { name: 'read', type: 'boolean', required: false },
    ],
    notification: [
      { name: 'title', type: 'string', required: true },
      { name: 'message', type: 'string', required: true },
      { name: 'read', type: 'boolean', required: false },
    ],
    order: [
      { name: 'status', type: 'string', required: true },
      { name: 'total', type: 'number', required: true },
      { name: 'userId', type: 'uuid', required: false },
    ],
    payment: [
      { name: 'amount', type: 'number', required: true },
      { name: 'status', type: 'string', required: true },
      { name: 'provider', type: 'string', required: false },
    ],
    post: [
      { name: 'title', type: 'string', required: true },
      { name: 'content', type: 'string', required: true },
      { name: 'published', type: 'boolean', required: false },
    ],
    product: [
      { name: 'name', type: 'string', required: true },
      { name: 'price', type: 'number', required: true },
      { name: 'description', type: 'string', required: false },
    ],
    project: [
      { name: 'name', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'status', type: 'string', required: false },
    ],
    report: [
      { name: 'title', type: 'string', required: true },
      { name: 'status', type: 'string', required: false },
      { name: 'createdAt', type: 'date', required: false },
    ],
    review: [
      { name: 'rating', type: 'number', required: true },
      { name: 'comment', type: 'string', required: false },
    ],
    shipment: [
      { name: 'trackingNumber', type: 'string', required: true },
      { name: 'status', type: 'string', required: true },
    ],
    student: [
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'rollNumber', type: 'string', required: false },
    ],
    subscription: [
      { name: 'plan', type: 'string', required: true },
      { name: 'status', type: 'string', required: true },
      { name: 'renewalDate', type: 'date', required: false },
    ],
    task: [
      { name: 'title', type: 'string', required: true },
      { name: 'description', type: 'string', required: false },
      { name: 'completed', type: 'boolean', required: false },
    ],
    teacher: [
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'subject', type: 'string', required: false },
    ],
    ticket: [
      { name: 'title', type: 'string', required: true },
      { name: 'priority', type: 'string', required: false },
      { name: 'status', type: 'string', required: true },
    ],
    user: [
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'string', required: true },
      { name: 'password', type: 'string', required: false },
    ],
    vendor: [
      { name: 'name', type: 'string', required: true },
      { name: 'email', type: 'string', required: false },
      { name: 'phone', type: 'string', required: false },
    ],
  };

  return presets[key] || [
    { name: 'name', type: 'string', required: true },
    { name: 'description', type: 'string', required: false },
  ];
}

function buildCrudEndpoints(entityName) {
  const normalized = normalizeEntityName(entityName);
  const resource = pluralize(normalized);

  return [
    { method: 'GET', path: `/${resource}`, entity: normalized, operation: 'list' },
    { method: 'POST', path: `/${resource}`, entity: normalized, operation: 'create' },
    { method: 'GET', path: `/${resource}/:id`, entity: normalized, operation: 'get' },
    { method: 'PUT', path: `/${resource}/:id`, entity: normalized, operation: 'replace' },
    { method: 'PATCH', path: `/${resource}/:id`, entity: normalized, operation: 'update' },
    { method: 'DELETE', path: `/${resource}/:id`, entity: normalized, operation: 'delete' },
  ];
}

function buildEntityDefinition(entityName, index = 0) {
  return {
    id: index + 1,
    name: normalizeEntityName(entityName),
    fields: defaultFieldsForEntity(entityName).map((field, fieldIndex) => ({
      id: fieldIndex + 1,
      name: field.name,
      type: field.type,
      required: Boolean(field.required),
    })),
  };
}

function extractCandidateTokens(text = '') {
  const lowered = String(text || '').toLowerCase();
  const directMatches = COMMON_ENTITY_ALIASES.filter((alias) =>
    new RegExp(`\\b${alias}s?\\b`, 'i').test(lowered),
  );

  const nounMatches = lowered
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .filter((token) => !/^\d+$/.test(token));

  return [...directMatches, ...nounMatches];
}

function uniqueEntities(values = []) {
  const seen = new Set();
  const results = [];

  for (const value of values) {
    const normalized = normalizeEntityName(value);
    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(normalized);
  }

  return results;
}

function inferEntitiesFromText(text = '', apiName = '') {
  const candidates = uniqueEntities(extractCandidateTokens(`${text} ${apiName}`));

  if (candidates.length > 0) {
    return candidates.slice(0, 5).map(buildEntityDefinition);
  }

  const fallback = /auth|login|register|account|profile/i.test(text)
    ? ['User', 'Session']
    : ['Resource'];

  return fallback.map(buildEntityDefinition);
}

function normalizeEntities(entities = []) {
  const validEntities = Array.isArray(entities)
    ? entities.filter((entity) => entity && typeof entity.name === 'string' && entity.name.trim())
    : [];

  if (validEntities.length === 0) {
    return [];
  }

  return validEntities.map((entity, index) => ({
    id: entity.id || index + 1,
    name: normalizeEntityName(entity.name),
    fields: Array.isArray(entity.fields) && entity.fields.length > 0
      ? entity.fields.map((field, fieldIndex) => ({
          id: field.id || fieldIndex + 1,
          name: field.name || `field${fieldIndex + 1}`,
          type: field.type || 'string',
          required: Boolean(field.required),
        }))
      : defaultFieldsForEntity(entity.name).map((field, fieldIndex) => ({
          id: fieldIndex + 1,
          name: field.name,
          type: field.type,
          required: Boolean(field.required),
        })),
  }));
}

function buildEndpointsFromEntities(entities = []) {
  return normalizeEntities(entities).flatMap((entity) => buildCrudEndpoints(entity.name));
}

function inferApiDesign({ name = '', description = '', rawPrompt = '', entities = [], endpoints = [] } = {}) {
  const normalizedEntities = normalizeEntities(entities);
  const finalEntities =
    normalizedEntities.length > 0
      ? normalizedEntities
      : inferEntitiesFromText(`${description} ${rawPrompt}`.trim(), name);

  return {
    entities: finalEntities,
    // ForgeAPI's live runtime and local fallback codegen are CRUD-based, so keep
    // the persisted/tested endpoint list canonical to the inferred entities.
    endpoints: buildEndpointsFromEntities(finalEntities),
  };
}

module.exports = {
  buildEndpointsFromEntities,
  inferApiDesign,
  inferEntitiesFromText,
  normalizeEntities,
  normalizeEntityName,
  pluralize,
};
