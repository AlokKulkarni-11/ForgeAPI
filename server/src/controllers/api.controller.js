const supabase = require('../config/supabase');
const archiver = require('archiver');
const axios = require('axios');
const logService = require('../services/log.service');
const { runPipeline } = require('../agents/orchestrator');
const { updateApiStatus } = require('../services/pipelinePersistence.service');
const ALLOWED_TEST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

const SAMPLE_UUID = '11111111-1111-1111-1111-111111111111';

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

const buildSampleBody = (endpoint = {}, entities = []) => {
  const targetEntity =
    entities.find((entity) => entity.name === endpoint.entity) ||
    entities.find((entity) =>
      endpoint.path?.toLowerCase().includes(`/${String(entity.name).toLowerCase()}s`)
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
};

const normalizePathForTest = (path = '/') =>
  path
    .replace(/:id\b/g, SAMPLE_UUID)
    .replace(/:([a-zA-Z_][a-zA-Z0-9_]*)/g, 'sample');

const executeTestRequest = async ({ baseUrl, method = 'GET', path = '/', headers = {}, body }) => {
  const normalizedMethod = String(method).toUpperCase();
  const targetUrl = new URL(path || '/', baseUrl).toString();
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
    res.json(apis);
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
        entities,
        endpoints,
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
      entities,
      endpoints,
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

    const { data: fileRows, error: fileError } = await supabase
      .from('api_files')
      .select('filepath, content')
      .eq('api_id', id)
      .order('filepath', { ascending: true });

    if (reqError) {
      console.warn("Requirements not found for API", id);
    }

    if (fileError) {
      console.warn('Generated files not found for API', id);
    }

    const files = (fileRows || []).reduce((acc, row) => {
      acc[row.filepath] = row.content;
      return acc;
    }, {});

    // Combine data
    res.json({
      ...apiData,
      requirements: reqData || null,
      files,
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
      .select('id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (apiError || !apiData) {
      return res.status(404).json({ error: 'API not found' });
    }

    const { data: reqData, error: reqError } = await supabase
      .from('api_requirements')
      .select('entities, endpoints')
      .eq('api_id', id)
      .single();

    if (reqError || !reqData) {
      return res.status(404).json({ error: 'API requirements not found' });
    }

    const endpoints = Array.isArray(reqData.endpoints) ? reqData.endpoints : [];
    const entities = Array.isArray(reqData.entities) ? reqData.entities : [];

    if (endpoints.length === 0) {
      return res.status(400).json({ error: 'No endpoints available for auto testing' });
    }

    await logService.save(id, 'testing', 'info', `Starting auto test suite for ${endpoints.length} endpoints`, {
      baseUrl,
    });

    const results = [];

    for (const endpoint of endpoints) {
      const endpointMethod = String(endpoint.method || 'GET').toUpperCase();

      if (!ALLOWED_TEST_METHODS.includes(endpointMethod)) {
        continue;
      }

      const testPath = normalizePathForTest(endpoint.path || '/');
      const body =
        ['GET', 'HEAD', 'DELETE', 'OPTIONS'].includes(endpointMethod)
          ? undefined
          : buildSampleBody(endpoint, entities);

      try {
        const result = await executeTestRequest({
          baseUrl,
          method: endpointMethod,
          path: testPath,
          headers,
          body,
        });

        await logService.save(
          id,
          'testing',
          result.ok ? 'success' : 'warning',
          `Auto ${endpointMethod} ${result.request.path} -> ${result.status}`,
          { operation: endpoint.operation || null, durationMs: result.durationMs },
        );

        results.push({
          ...result,
          endpoint: {
            method: endpointMethod,
            path: endpoint.path || '/',
            operation: endpoint.operation || null,
          },
        });
      } catch (err) {
        const message = axios.isAxiosError(err)
          ? err.response?.data?.error || err.message
          : err.message || 'Auto test request failed';

        await logService.save(
          id,
          'testing',
          'error',
          `Auto ${endpointMethod} ${testPath} failed`,
          { error: message },
        );

        results.push({
          ok: false,
          status: 0,
          statusText: 'REQUEST_FAILED',
          durationMs: 0,
          headers: {},
          data: { error: message },
          request: {
            method: endpointMethod,
            url: new URL(testPath, baseUrl).toString(),
            path: testPath,
          },
          endpoint: {
            method: endpointMethod,
            path: endpoint.path || '/',
            operation: endpoint.operation || null,
          },
        });
      }
    }

    const passed = results.filter((result) => result.ok).length;
    const failed = results.length - passed;

    await logService.save(
      id,
      'testing',
      failed === 0 ? 'success' : 'warning',
      `Auto test suite finished: ${passed}/${results.length} passed`,
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
    const userId = req.user.id;
    const { id } = req.params;

    const { data: apiData, error: apiError } = await supabase
      .from('apis')
      .select('id, name')
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
