const axios = require('axios');

const SAMPLE_UUID = '11111111-1111-1111-1111-111111111111';
const BODY_METHODS = new Set(['POST', 'PUT', 'PATCH']);

const normalizePath = (path = '/') =>
  path
    .replace(/\{id\}/gi, SAMPLE_UUID)
    .replace(/:id\b/gi, SAMPLE_UUID)
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, 'sample');

const buildSampleValue = (field = {}) => {
  switch (field.type) {
    case 'number':
      return 42;
    case 'boolean':
      return true;
    case 'date':
      return new Date().toISOString();
    case 'uuid':
      return SAMPLE_UUID;
    default:
      return field.name ? `${field.name}-sample` : 'sample';
  }
};

const buildRequestBody = (endpoint = {}, spec = {}) => {
  const entity = (spec.entities || []).find(
    (item) => String(item.name).toLowerCase() === String(endpoint.entity).toLowerCase(),
  );

  if (!entity || !Array.isArray(entity.fields)) {
    return { name: 'sample-name' };
  }

  return entity.fields.reduce((payload, field) => {
    if (field.name && field.name !== 'id') {
      payload[field.name] = buildSampleValue(field);
    }

    return payload;
  }, {});
};

const getExpectedStatus = (endpoint = {}) => {
  const method = String(endpoint.method || 'GET').toUpperCase();
  const path = endpoint.path || '/';
  const authStatuses = endpoint.auth ? [401, 403] : [];

  if (method === 'POST') {
    return [200, 201, ...authStatuses];
  }

  if (method === 'DELETE') {
    return [200, 202, 204, 404, ...authStatuses];
  }

  if ((method === 'GET' || method === 'PUT' || method === 'PATCH') && /:id\b|\{id\}/i.test(path)) {
    return [200, 404, ...authStatuses];
  }

  return [200, ...authStatuses];
};

const runCase = async ({ baseUrl, endpoint, spec }) => {
  const method = String(endpoint.method || 'GET').toUpperCase();
  const path = normalizePath(endpoint.path || '/');
  const targetUrl = new URL(path, baseUrl).toString();
  const expectedStatuses = getExpectedStatus(endpoint);
  const startedAt = Date.now();

  try {
    const response = await axios.request({
      url: targetUrl,
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer forgeapi-test-token',
      },
      data: BODY_METHODS.has(method) ? buildRequestBody(endpoint, spec) : undefined,
      timeout: 15000,
      validateStatus: () => true,
    });

    const responseTime = Date.now() - startedAt;
    const passed = expectedStatuses.includes(response.status);

    return {
      name: `${method} ${endpoint.path || path}`,
      method,
      url: targetUrl,
      headers: { 'Content-Type': 'application/json' },
      body: BODY_METHODS.has(method) ? buildRequestBody(endpoint, spec) : null,
      expectedStatus: expectedStatuses.join('|'),
      actualStatus: response.status,
      passed,
      responseTime,
      error: passed ? null : `Expected ${expectedStatuses.join(' or ')}, received ${response.status}`,
    };
  } catch (err) {
    return {
      name: `${method} ${endpoint.path || path}`,
      method,
      url: targetUrl,
      headers: { 'Content-Type': 'application/json' },
      body: BODY_METHODS.has(method) ? buildRequestBody(endpoint, spec) : null,
      expectedStatus: expectedStatuses.join('|'),
      actualStatus: 0,
      passed: false,
      responseTime: Date.now() - startedAt,
      error: err.message || 'Request failed',
    };
  }
};

const runSecuritySmokeCases = async (baseUrl, spec = {}) => {
  const endpoints = Array.isArray(spec.endpoints) ? spec.endpoints : [];
  const firstWritable = endpoints.find((endpoint) =>
    BODY_METHODS.has(String(endpoint.method || '').toUpperCase()),
  );

  if (!firstWritable) {
    return [];
  }

  const method = String(firstWritable.method).toUpperCase();
  const path = normalizePath(firstWritable.path || '/');
  const targetUrl = new URL(path, baseUrl).toString();
  const startedAt = Date.now();

  try {
    const response = await axios.request({
      url: targetUrl,
      method,
      headers: { 'Content-Type': 'application/json' },
      data: {
        name: "' OR 1=1 --",
        script: '<script>alert("forgeapi")</script>',
      },
      timeout: 15000,
      validateStatus: () => true,
    });

    const passed = response.status >= 400 && response.status < 500;

    return [
      {
        name: `${method} ${firstWritable.path} rejects suspicious payload`,
        method,
        url: targetUrl,
        headers: { 'Content-Type': 'application/json' },
        body: { name: "' OR 1=1 --", script: '<script>alert("forgeapi")</script>' },
        expectedStatus: '4xx',
        actualStatus: response.status,
        passed,
        responseTime: Date.now() - startedAt,
        error: passed ? null : `Expected a 4xx validation response, received ${response.status}`,
      },
    ];
  } catch (err) {
    return [
      {
        name: `${method} ${firstWritable.path} rejects suspicious payload`,
        method,
        url: targetUrl,
        headers: { 'Content-Type': 'application/json' },
        body: { name: "' OR 1=1 --", script: '<script>alert("forgeapi")</script>' },
        expectedStatus: '4xx',
        actualStatus: 0,
        passed: false,
        responseTime: Date.now() - startedAt,
        error: err.message || 'Security smoke request failed',
      },
    ];
  }
};

const run = async (sandboxUrl, spec, testMode = 'functional') => {
  const endpoints = Array.isArray(spec?.endpoints) ? spec.endpoints : [];

  if (!sandboxUrl) {
    return {
      passed: false,
      testMode,
      totalTests: 1,
      passedTests: 0,
      failedTests: 1,
      testCases: [
        {
          name: 'Sandbox URL available',
          passed: false,
          error: 'No sandbox URL was returned by deployment',
        },
      ],
    };
  }

  const functionalCases = await Promise.all(
    endpoints.map((endpoint) => runCase({ baseUrl: sandboxUrl, endpoint, spec })),
  );

  const securityCases =
    testMode === 'security' || testMode === 'all'
      ? await runSecuritySmokeCases(sandboxUrl, spec)
      : [];

  const testCases = [...functionalCases, ...securityCases];
  const passedTests = testCases.filter((testCase) => testCase.passed).length;

  return {
    passed: testCases.length > 0 && passedTests === testCases.length,
    testMode,
    totalTests: testCases.length,
    passedTests,
    failedTests: testCases.length - passedTests,
    testCases,
  };
};

module.exports = { run };
