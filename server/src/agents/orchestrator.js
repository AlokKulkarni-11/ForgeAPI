const requirementAgent = require('./requirementAgent');
const generationAgent = require('./generationAgent');
const testingAgent = require('./testingAgent');
const scoringAgent = require('./scoringAgent');
const healingAgent = require('./healingAgent');
const logService = require('../services/log.service');
const sandboxManager = require('../sandbox/sandboxManager');
const {
  saveApiFiles,
  saveTestReport,
  saveSecurityReport,
  updateApiStatus,
} = require('../services/pipelinePersistence.service');

async function runPipeline(apiId, requirements, userConfig) {
  let iteration = 0;
  const maxIterations = 3;
  const passScore = 85;
  let currentCode = null;
  let spec = null;
  let needsGeneration = true;

  const log = (agent, level, message, metadata) =>
    logService.save(apiId, agent, level, message, metadata, iteration);

  await updateApiStatus(apiId, 'generating', null, null, 0);

  while (iteration < maxIterations) {
    iteration++;
    await updateApiStatus(apiId, iteration === 1 ? 'generating' : 'healing', null, null, iteration);
    await log('system', 'info', `Starting iteration ${iteration}`);

    if (iteration === 1) {
      spec = await requirementAgent.run(requirements, userConfig);
      if (spec?.__forgeMeta?.fallbackUsed) {
        await log('requirement', 'warning', 'Specification built from fallback normalization', {
          reason: spec.__forgeMeta.reason,
        });
      } else {
        await log('requirement', 'success', 'Specification parsed', spec);
      }
    }

    if (needsGeneration) {
      currentCode = await generationAgent.run(spec, userConfig.framework, currentCode, iteration);
      await log('generation', 'success', `${Object.keys(currentCode).length} files generated`);
    } else {
      await log('healing', 'success', `${Object.keys(currentCode).length} healed files ready for testing`);
    }

    await saveApiFiles(apiId, currentCode);
    await log(
      needsGeneration ? 'generation' : 'healing',
      'info',
      `${needsGeneration ? 'Generated' : 'Healed'} files persisted to workspace storage`,
    );

    const sandboxUrl = await sandboxManager.deploy(apiId, currentCode);
    await updateApiStatus(apiId, 'testing', null, sandboxUrl, iteration);
    await log('sandbox', 'success', `Sandbox live at ${sandboxUrl}`);

    const testReport = await testingAgent.run(sandboxUrl, spec, userConfig.testMode);
    await saveTestReport(apiId, testReport, iteration);
    await log(
      'testing',
      testReport.passed ? 'success' : 'warning',
      `${testReport.passedTests}/${testReport.totalTests} tests passed`,
    );

    const secReport = await scoringAgent.run(currentCode, testReport, spec);
    await saveSecurityReport(apiId, secReport, iteration);
    await log(
      'scoring',
      secReport.score >= passScore ? 'success' : 'warning',
      `OWASP Score: ${secReport.score}/100`,
      { passed: secReport.passed, vulnerabilities: secReport.vulnerabilities },
    );

    if (secReport.score >= passScore && testReport.passed) {
      await updateApiStatus(apiId, 'live', secReport.score, sandboxUrl, iteration);
      await log('system', 'success', `Pipeline complete, checks passed with OWASP ${secReport.score}/100`);
      return { success: true, score: secReport.score, sandboxUrl };
    }

    if (iteration < maxIterations) {
      await log(
        'healing',
        'warning',
        `Score ${secReport.score} - starting heal iteration ${iteration + 1}`,
      );
      const healContext = { testReport, secReport, currentCode };
      currentCode = await healingAgent.run(healContext, spec);
      needsGeneration = false;
    }
  }

  await updateApiStatus(apiId, 'failed', null, null, iteration);
  await log('system', 'error', `Max iterations (${maxIterations}) reached`);
  return { success: false, score: 0 };
}

module.exports = { runPipeline };
