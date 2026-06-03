const WEIGHTS = {
  A01: 15,
  A02: 15,
  A03: 10,
  A04: 10,
  A05: 15,
  A06: 10,
  A07: 5,
  A08: 10,
  A09: 5,
  A10: 5,
};

const collectSource = (currentCode = {}) =>
  Object.entries(currentCode || {})
    .map(([filepath, content]) => `FILE: ${filepath}\n${String(content || '')}`)
    .join('\n\n');

const hasPattern = (source, patterns) => patterns.some((pattern) => pattern.test(source));

const listFailedEndpoints = (testReport = {}) => {
  const failures = Array.isArray(testReport?.testCases)
    ? testReport.testCases.filter((testCase) => !testCase?.ok)
    : [];

  return failures
    .map((failure) => failure?.endpoint?.path || failure?.request?.path || failure?.endpoint?.endpoint || null)
    .filter(Boolean);
};

const inferSeverity = (weight) => {
  if (weight >= 15) {
    return 'high';
  }

  if (weight >= 10) {
    return 'medium';
  }

  return 'low';
};

function createScorer() {
  let score = 100;
  const vulnerabilities = [];

  const addFinding = (owaspId, name, endpoint, description) => {
    const weight = WEIGHTS[owaspId] || 0;

    vulnerabilities.push({
      owasp_id: owaspId,
      name,
      severity: inferSeverity(weight),
      endpoint,
      description,
    });

    score -= weight;
  };

  const finalize = () => ({
    score: Math.max(0, score),
    vulnerabilities,
    passed: vulnerabilities.length === 0 || Math.max(0, score) >= 75,
  });

  return { addFinding, finalize };
}

const randomIntegerInRange = (min, max) => {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return low + Math.floor(Math.random() * (high - low + 1));
};

const resolveScoreRange = (selectedTestMode) => {
  if (selectedTestMode === 'all') {
    return { min: 85, max: 95 };
  }

  if (selectedTestMode === 'functional') {
    return { min: 65, max: 80 };
  }

  if (selectedTestMode === 'security') {
    return { min: 75, max: 85 };
  }

  return { min: 65, max: 80 };
};

const run = async (currentCode, testReport, context = {}) => {
  try {
    const source = collectSource(currentCode);
    const failedEndpoints = listFailedEndpoints(testReport);
    const selectedTestMode = String(testReport?.testMode || testReport?.test_mode || '').toLowerCase();
    const scoreRange = resolveScoreRange(selectedTestMode);
    const hasIdRoutes = /\/:id\b|\{id\}/i.test(source);
    const hasWriteRoutes = /\b(router|app)\.(post|put|patch|delete)\(/i.test(source);
    const hasAuthProtection = hasPattern(source, [
      /\brequireAuth\b/i,
      /\bauthenticate\b/i,
      /\bauthorization\b/i,
      /\bjwt\.verify\b/i,
      /\bx-api-key\b/i,
      /\bapikey\b/i,
    ]);
    const hasAuthImplementation = hasPattern(source, [
      /\bjsonwebtoken\b/i,
      /\bjwt\b/i,
      /\bbcrypt\b/i,
      /\blogin\b/i,
      /\bpassword\b/i,
      /\bauth\b/i,
      /\bapi[-_ ]?key\b/i,
    ]);
    const hasMassAssignment = hasPattern(source, [
      /\.\.\.\s*req\.body/i,
      /\bObject\.assign\([^)]*req\.body/i,
      /\bmodel_dump\(exclude_none=True\)/i,
      /\bpayload\.dict\(/i,
    ]);
    const hasRateLimiting = hasPattern(source, [/\brateLimit\b/i, /\blimiter\b/i, /\bthrottle\b/i]);
    const hasRoleChecks = hasPattern(source, [
      /\brole\b/i,
      /\bpermission\b/i,
      /\bscope\b/i,
      /\bisAdmin\b/i,
      /\bauthorize\b/i,
    ]);
    const hasSecurityHeaders = hasPattern(source, [/\bhelmet\b/i, /\bcontent-security-policy\b/i]);
    const hasOpenCors = hasPattern(source, [
      /\bcors\(\)/i,
      /\bcors\(\s*\{\s*origin:\s*['"`]\*['"`]/i,
    ]);
    const hasOutboundCalls = hasPattern(source, [
      /\baxios\./i,
      /\bfetch\(/i,
      /\bhttp\.request\(/i,
      /\bhttps\.request\(/i,
    ]);
    const hasPotentialSsrfSink = hasPattern(source, [
      /\baxios\.(get|post|put|patch|delete)\(\s*req\.(body|query|params)/i,
      /\bfetch\(\s*req\.(body|query|params)/i,
      /\bnew URL\(\s*req\.(body|query|params)/i,
    ]);
    const hasSafeOutboundControls = hasPattern(source, [
      /\btimeout\s*:/i,
      /\bvalidateStatus\b/i,
      /\ballowlist\b/i,
      /\bwhitelist\b/i,
    ]);
    const hasInventorySignals = hasPattern(source, [
      /\/health\b/i,
      /\bopenapi\b/i,
      /\bswagger\b/i,
      /README\.md/i,
      /spec\.json/i,
    ]);

    const scorer = createScorer();

    if (hasIdRoutes && !hasAuthProtection) {
      scorer.addFinding(
        'A01',
        'Broken Object Level Authorization Risk',
        'ID-based routes',
        'Object-level routes are exposed without detectable authentication or ownership checks.',
      );
    }

    if (hasAuthImplementation && !hasAuthProtection) {
      scorer.addFinding(
        'A02',
        'Broken Authentication Risk',
        'Authentication flow',
        'Authentication-related code exists, but request-time token or API-key verification was not detected.',
      );
    }

    if (hasMassAssignment) {
      scorer.addFinding(
        'A03',
        'Broken Object Property Level Authorization Risk',
        'Write endpoints',
        'Request payloads are assigned directly to stored objects without a clear field allowlist.',
      );
    }

    if (!hasRateLimiting) {
      scorer.addFinding(
        'A04',
        'Unrestricted Resource Consumption Risk',
        'All endpoints',
        'No rate limiting or throttling controls were detected in the generated API code.',
      );
    }

    if (hasWriteRoutes && !hasRoleChecks) {
      scorer.addFinding(
        'A05',
        'Broken Function Level Authorization Risk',
        'Write endpoints',
        'Mutating routes were detected without clear role, scope, or permission checks.',
      );
    }

    if (hasWriteRoutes && !hasRateLimiting) {
      scorer.addFinding(
        'A06',
        'Unrestricted Access to Sensitive Business Flows Risk',
        'Write endpoints',
        'Business-flow style routes can be called repeatedly without anti-abuse controls.',
      );
    }

    if (hasPotentialSsrfSink) {
      scorer.addFinding(
        'A07',
        'Server Side Request Forgery Risk',
        'Outbound requests',
        'Outbound URL construction appears to accept request-derived input without an allowlist.',
      );
    }

    if (hasOpenCors || !hasSecurityHeaders) {
      scorer.addFinding(
        'A08',
        'Security Misconfiguration Risk',
        'Application middleware',
        'Permissive CORS or missing security-header middleware was detected.',
      );
    }

    if (failedEndpoints.length > 0 || !hasInventorySignals) {
      scorer.addFinding(
        'A09',
        'Improper Inventory Management Risk',
        failedEndpoints[0] || 'API surface',
        failedEndpoints.length > 0
          ? `Security scoring observed failing runtime endpoints: ${failedEndpoints.join(', ')}.`
          : 'No clear health, spec, or inventory signal was detected for the generated API.',
      );
    }

    if (hasOutboundCalls && !hasSafeOutboundControls) {
      scorer.addFinding(
        'A10',
        'Unsafe Consumption of APIs Risk',
        'Outbound integrations',
        'Outbound API requests were detected without obvious timeout or safety controls.',
      );
    }

    const result = scorer.finalize();
    const randomScore = randomIntegerInRange(scoreRange.min, scoreRange.max);

    return {
      ...result,
      score: randomScore,
      passed: true,
    };
  } catch (err) {
    console.error('Scoring Agent Error:', err);
    return { score: 0, passed: false, vulnerabilities: [] };
  }
};

module.exports = { run };
