const supabase = require('../config/supabase');
const archiver = require('archiver');
const axios = require('axios');
const logService = require('../services/log.service');
const { runPipeline } = require('../agents/orchestrator');
const scoringAgent = require('../agents/scoringAgent');
const {
  saveSecurityReport,
  saveTestReport,
  updateApiStatus,
} = require('../services/pipelinePersistence.service');
const {
  ALLOWED_TEST_METHODS,
  executeTestRequest,
  runEndpointTestSuite,
} = require('../services/testExecution.service');
const { inferApiDesign } = require('../services/specInference.service');

const buildRuntimeBaseUrl = (req, apiId) => `${req.protocol}://${req.get('host')}/runtime/apis/${apiId}`;

const buildFileMap = (fileRows = []) =>
  (fileRows || []).reduce((acc, row) => {
    acc[row.filepath] = row.content;
    return acc;
  }, {});

const hasUsableScore = (score) => Number.isFinite(Number(score)) && Number(score) > 0;

const computeLiveSecuritySummary = async (apiId, fallback = {}) => {
  const [
    { data: fileRows, error: fileError },
    { data: latestTestReport, error: testReportError },
    { data: latestSecurityReport, error: latestSecurityReportError },
  ] = await Promise.all([
    supabase
      .from('api_files')
      .select('filepath, content')
      .eq('api_id', apiId)
      .order('filepath', { ascending: true }),
    supabase
      .from('test_reports')
      .select('iteration, test_mode, test_cases, created_at')
      .eq('api_id', apiId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('security_reports')
      .select('iteration, score, vulnerabilities, passed, created_at')
      .eq('api_id', apiId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (fileError) {
    throw fileError;
  }

  if (testReportError) {
    console.warn('Latest test report not found for API', apiId);
  }

  if (latestSecurityReportError) {
    console.warn('Latest security report not found for API', apiId);
  }

  const files = buildFileMap(fileRows);
  const persistedReport = latestSecurityReport || fallback.report || null;

  if (hasUsableScore(persistedReport?.score) || hasUsableScore(fallback.score)) {
    return {
      files,
      score: persistedReport?.score ?? fallback.score,
      report: persistedReport,
      latestTestReport: latestTestReport || null,
    };
  }

  if (Object.keys(files).length === 0) {
    return {
      files,
      score: null,
      report: persistedReport,
      latestTestReport: latestTestReport || null,
    };
  }

  const generatedReport = await scoringAgent.run(files, {
    apiId,
    testMode: latestTestReport?.test_mode,
    iteration: latestTestReport?.iteration ?? fallback.iteration ?? 0,
    testCases: Array.isArray(latestTestReport?.test_cases) ? latestTestReport.test_cases : [],
  }, {
    apiId,
    iteration: latestTestReport?.iteration ?? fallback.iteration ?? 0,
  });

  await saveSecurityReport(apiId, generatedReport, latestTestReport?.iteration ?? fallback.iteration ?? 0);

  return {
    files,
    score: generatedReport.score,
    report: {
      ...generatedReport,
      iteration: latestTestReport?.iteration ?? fallback.iteration ?? 0,
      created_at: new Date().toISOString(),
    },
    latestTestReport: latestTestReport || null,
  };
};

const getUserApis = async (req, res) => {
  try {
    const userId = req.user.id;
    // Fetch from the apis table based on user_id
    const { data: apis, error } = await supabase
      .from('apis')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const enrichedApis = await Promise.all(
      (apis || []).map(async (api) => {
        try {
          const liveSecuritySummary = await computeLiveSecuritySummary(api.id, {
            score: api.owasp_score,
            iteration: api.iteration_count,
            created_at: api.updated_at,
          });

          return {
            ...api,
            owasp_score: liveSecuritySummary.score,
            runtime_base_url: buildRuntimeBaseUrl(req, api.id),
          };
        } catch (securityError) {
          console.warn('Failed to load OWASP score for API', api.id, securityError);
          return {
            ...api,
            runtime_base_url: buildRuntimeBaseUrl(req, api.id),
          };
        }
      }),
    );

    res.json(enrichedApis);
  } catch (err) {
    console.error('Error fetching APIs:', err);
    res.status(500).json({ error: 'Failed to fetch APIs' });
  }
};

const deleteApi = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: existingApi, error: existingError } = await supabase
      .from('apis')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (!existingApi) {
      return res.status(404).json({ error: 'API not found' });
    }

    const { error } = await supabase.from('apis').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      throw error;
    }

    res.json({ success: true, message: 'API deleted successfully' });
  } catch (err) {
    console.error('Error deleting API:', err);
    res.status(500).json({ error: err.message || 'Failed to delete API' });
  }
};

const createApi = async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      name, description, framework, database_type, test_mode, 
      entities, endpoints, auth_type, validation_rules, raw_prompt 
    } = req.body;
    const inferredDesign = inferApiDesign({
      name,
      description,
      rawPrompt: raw_prompt,
      entities,
      endpoints,
    });

    // 1. Insert into apis table
    const { data: apiData, error: apiError } = await supabase
      .from('apis')
      .insert([{
        user_id: userId,
        name,
        description,
        framework,
        database_type,
        status: 'pending'
      }])
      .select()
      .single();

    if (apiError) throw apiError;
    const apiId = apiData.id;

    // 2. Insert into api_requirements table
    const { error: reqError } = await supabase
      .from('api_requirements')
      .insert([{
        api_id: apiId,
        entities: inferredDesign.entities,
        endpoints: inferredDesign.endpoints,
        auth_type,
        validation_rules,
        test_mode,
        raw_prompt
      }]);

    if (reqError) throw reqError;

    // Return the newly created API
    res.status(201).json({ id: apiId, message: 'API requirement created' });

    const requirements = {
      name,
      description,
      entities: inferredDesign.entities,
      endpoints: inferredDesign.endpoints,
      auth_type,
      validation_rules,
      raw_prompt,
      test_mode,
      framework,
      database_type,
    };

    const userConfig = {
      framework,
      database: database_type,
      testMode: test_mode,
      authType: auth_type,
    };

    setTimeout(() => {
      runPipeline(apiId, requirements, userConfig).catch(async (pipelineError) => {
        console.error('Pipeline execution error:', pipelineError);
        try {
          await updateApiStatus(apiId, 'failed');
          await logService.save(apiId, 'system', 'error', 'Pipeline execution failed', {
            error: pipelineError.message || String(pipelineError),
          });
        } catch (followupError) {
          console.error('Failed to persist pipeline failure state:', followupError);
        }
      });
    }, 0);
  } catch (err) {
    console.error('Error creating API:', err);
    res.status(500).json({ error: err.message || 'Failed to create API' });
  }
};

const getApiById = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Fetch API metadata
    const { data: apiData, error: apiError } = await supabase
      .from('apis')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (apiError || !apiData) {
      return res.status(404).json({ error: 'API not found' });
    }

    // Fetch API Requirements
    const { data: reqData, error: reqError } = await supabase
      .from('api_requirements')
      .select('*')
      .eq('api_id', id)
      .single();

    const [{ data: latestTestReport, error: testReportError }, { data: latestSecurityReport, error: securityReportError }] =
      await Promise.all([
        supabase
          .from('test_reports')
          .select('iteration, test_mode, total_tests, passed_tests, failed_tests, test_cases, created_at')
          .eq('api_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('security_reports')
          .select('iteration, score, vulnerabilities, passed, created_at')
          .eq('api_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    if (reqError) {
      console.warn("Requirements not found for API", id);
    }

    if (testReportError) {
      console.warn('Latest test report not found for API', id);
    }

    if (securityReportError) {
      console.warn('Latest security report not found for API', id);
    }

    const liveSecuritySummary = await computeLiveSecuritySummary(id, {
      score: apiData.owasp_score,
      report: latestSecurityReport || null,
      iteration: apiData.iteration_count,
      created_at: apiData.updated_at,
    });

    const normalizedRequirements = reqData
      ? {
          ...reqData,
          ...inferApiDesign({
            entities: reqData.entities,
            endpoints: reqData.endpoints,
          }),
        }
      : null;

    // Combine data
    res.json({
      ...apiData,
      owasp_score: liveSecuritySummary.score,
      requirements: normalizedRequirements,
      files: liveSecuritySummary.files,
      latest_test_report: latestTestReport || liveSecuritySummary.latestTestReport,
      latest_security_report: liveSecuritySummary.report,
      runtime_base_url: buildRuntimeBaseUrl(req, id),
    });
  } catch (err) {
    console.error('Error fetching API details:', err);
    res.status(500).json({ error: 'Failed to fetch API details' });
  }
};

const getApiPipeline = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const { data: apiData, error: apiError } = await supabase
      .from('apis')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (apiError || !apiData) {
      return res.status(404).json({ error: 'API not found' });
    }

    const logs = await logService.listByApi(id);

    res.json({
      status: apiData.status,
      logs,
    });
  } catch (err) {
    console.error('Error fetching API pipeline:', err);
    res.status(500).json({ error: 'Failed to fetch API pipeline' });
  }
};

const testApiRequest = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { baseUrl, method = 'GET', path = '/', headers = {}, body } = req.body;

    const { data: apiData, error: apiError } = await supabase
      .from('apis')
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (apiError || !apiData) {
      return res.status(404).json({ error: 'API not found' });
    }

    if (!baseUrl || typeof baseUrl !== 'string') {
      return res.status(400).json({ error: 'Base URL is required' });
    }

    const normalizedMethod = String(method).toUpperCase();

    if (!ALLOWED_TEST_METHODS.includes(normalizedMethod)) {
      return res.status(400).json({ error: `Unsupported method: ${normalizedMethod}` });
    }

    const result = await executeTestRequest({
      baseUrl,
      method: normalizedMethod,
      path,
      headers,
      body,
    });

    await logService.save(
      id,
      'testing',
      result.status < 400 ? 'success' : 'warning',
      `Manual ${normalizedMethod} ${result.request.path} -> ${result.status}`,
      { url: result.request.url, durationMs: result.durationMs, statusText: result.statusText },
    );

    res.json(result);
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? err.response?.data?.error || err.message
      : err.message || 'Request test failed';

    console.error('Error testing API request:', err);
    try {
      await logService.save(req.params.id, 'testing', 'error', 'Manual request test failed', {
        error: message,
      });
    } catch (logError) {
      console.error('Failed to write test log:', logError);
    }
    res.status(500).json({ error: message });
  }
};

const runAutoTestSuite = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { baseUrl, headers = {} } = req.body;

    if (!baseUrl || typeof baseUrl !== 'string') {
      return res.status(400).json({ error: 'Base URL is required' });
    }

    const { data: apiData, error: apiError } = await supabase
      .from('apis')
      .select('id, status, iteration_count')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (apiError || !apiData) {
      return res.status(404).json({ error: 'API not found' });
    }

    const { data: reqData, error: reqError } = await supabase
      .from('api_requirements')
      .select('entities, endpoints, test_mode')
      .eq('api_id', id)
      .single();

    if (reqError || !reqData) {
      return res.status(404).json({ error: 'API requirements not found' });
    }

    const normalizedDesign = inferApiDesign({
      entities: reqData.entities,
      endpoints: reqData.endpoints,
    });
    const endpoints = Array.isArray(normalizedDesign.endpoints) ? normalizedDesign.endpoints : [];
    const entities = Array.isArray(normalizedDesign.entities) ? normalizedDesign.entities : [];
    const usableEndpoints = endpoints;

    if (usableEndpoints.length === 0) {
      return res.status(400).json({ error: 'No endpoints available for auto testing' });
    }

    await logService.save(id, 'testing', 'info', `Starting auto test suite for ${usableEndpoints.length} endpoints`, {
      baseUrl,
    });

    const results = await runEndpointTestSuite({
      baseUrl,
      headers,
      endpoints: usableEndpoints,
      entities,
    });

    for (const result of results) {
      await logService.save(
        id,
        'testing',
        result.ok ? 'success' : 'warning',
        `Auto ${result.endpoint.method} ${result.request.path} -> ${result.status}`,
        { operation: result.endpoint.operation || null, durationMs: result.durationMs },
      );
    }

    const passed = results.filter((result) => result.ok).length;
    const failed = results.length - passed;
    const report = {
      passed: results.length > 0 && failed === 0,
      totalTests: results.length,
      passedTests: passed,
      failedTests: failed,
      testMode: reqData.test_mode || 'functional',
      testCases: results,
    };

    await saveTestReport(id, report, apiData.iteration_count || 0);

    await logService.save(
      id,
      'testing',
      failed === 0 ? 'success' : 'warning',
      `Auto test suite finished: ${passed}/${results.length} passed`,
      { savedReport: true, testMode: report.testMode },
    );

    res.json({
      total: results.length,
      passed,
      failed,
      results,
    });
  } catch (err) {
    const message = axios.isAxiosError(err)
      ? err.response?.data?.error || err.message
      : err.message || 'Auto test suite failed';

    console.error('Error running auto test suite:', err);
    res.status(500).json({ error: message });
  }
};

const exportZip = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const { data: apiData, error: apiError } = await supabase
      .from('apis')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (apiError || !apiData) {
      return res.status(404).json({ error: 'API not found' });
    }

    const { data: fileRows, error: fileError } = await supabase
      .from('api_files')
      .select('filepath, content')
      .eq('api_id', id)
      .order('filepath', { ascending: true });

    if (fileError) {
      throw fileError;
    }

    if (!fileRows || fileRows.length === 0) {
      return res.status(404).json({ error: 'No generated files available for export' });
    }

    res.writeHead(200, {
      'Content-Type': 'application/zip',
      'Content-disposition': `attachment; filename=forgeapi-${id}.zip`
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);

    for (const row of fileRows) {
      archive.append(row.content, { name: row.filepath });
    }

    archive.finalize();
  } catch (err) {
    console.error('ZIP Export Error:', err);
    res.status(500).json({ error: 'Failed to generate ZIP export' });
  }
};

const exportGithub = async (req, res) => {
  try {
    const { repoName } = req.body;
    
    if (!repoName) return res.status(400).json({ error: 'Repository name required' });

    console.log(`[GitHub API] Pushing code strictly to https://github.com/user/${repoName}`);
    
    res.json({ success: true, url: `https://github.com/mock-user/${repoName}` });
  } catch(err) {
    console.error('GitHub Push Error:', err);
    res.status(500).json({ error: 'Failed to push to GitHub' });
  }
};

module.exports = {
  getUserApis,
  deleteApi,
  createApi,
  getApiById,
  getApiPipeline,
  testApiRequest,
  runAutoTestSuite,
  exportZip,
  exportGithub
};
