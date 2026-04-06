const supabase = require('../config/supabase');

function extractSandboxPort(sandboxUrl) {
  if (!sandboxUrl) {
    return null;
  }

  try {
    const parsed = new URL(sandboxUrl);
    return parsed.port ? Number(parsed.port) : null;
  } catch {
    return null;
  }
}

async function saveApiFiles(apiId, code) {
  const { error: deleteError } = await supabase.from('api_files').delete().eq('api_id', apiId);

  if (deleteError) {
    throw deleteError;
  }

  const entries = Object.entries(code || {});

  if (entries.length === 0) {
    return;
  }

  const rows = entries.map(([filepath, content]) => {
    const parts = filepath.split('/');
    return {
      api_id: apiId,
      filename: parts[parts.length - 1],
      filepath,
      content:
        typeof content === 'string' ? content : JSON.stringify(content, null, 2),
    };
  });

  const { error } = await supabase.from('api_files').insert(rows);

  if (error) {
    throw error;
  }
}

async function saveTestReport(apiId, report, iteration) {
  const payload = {
    api_id: apiId,
    iteration,
    test_mode: report?.testMode || 'functional',
    total_tests: report?.totalTests || 0,
    passed_tests: report?.passedTests || 0,
    failed_tests: report?.failedTests || 0,
    test_cases: report?.testCases || [],
  };

  const { error } = await supabase.from('test_reports').insert([payload]);

  if (error) {
    throw error;
  }
}

async function saveSecurityReport(apiId, report, iteration) {
  const payload = {
    api_id: apiId,
    iteration,
    score: report?.score || 0,
    vulnerabilities: report?.vulnerabilities || [],
    passed: Boolean(report?.passed),
  };

  const { error } = await supabase.from('security_reports').insert([payload]);

  if (error) {
    throw error;
  }
}

async function updateApiStatus(apiId, status, score = null, sandboxUrl = null, iteration = null) {
  const payload = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (score != null) {
    payload.owasp_score = score;
  }

  if (sandboxUrl) {
    payload.sandbox_port = extractSandboxPort(sandboxUrl);
  }

  if (iteration != null) {
    payload.iteration_count = iteration;
  }

  const { error } = await supabase.from('apis').update(payload).eq('id', apiId);

  if (error) {
    throw error;
  }
}

module.exports = {
  saveApiFiles,
  saveTestReport,
  saveSecurityReport,
  updateApiStatus,
};
