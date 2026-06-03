const { runEndpointTestSuite } = require('../services/testExecution.service');

const run = async (baseUrl, spec, testMode) => {
  try {
    const endpoints = Array.isArray(spec?.endpoints) ? spec.endpoints : [];
    const entities = Array.isArray(spec?.entities) ? spec.entities : [];
    const results = await runEndpointTestSuite({
      baseUrl,
      headers: {},
      endpoints,
      entities,
    });
    const passedTests = results.filter((result) => result.ok).length;

    return {
      passed: results.length > 0 && passedTests === results.length,
      totalTests: results.length,
      passedTests,
      failedTests: results.length - passedTests,
      testMode,
      testCases: results,
    };
  } catch (err) {
    console.error('Testing Agent Error:', err);
    return {
      passed: false,
      totalTests: 1,
      passedTests: 0,
      failedTests: 1,
      testMode,
      testCases: [{ name: 'Test execution', passed: false, error: err.message }],
    };
  }
};

module.exports = { run };
