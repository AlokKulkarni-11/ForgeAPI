const buildSourceBundle = (currentCode = {}) =>
  Object.entries(currentCode)
    .map(([filepath, content]) => `\n/* FILE: ${filepath} */\n${String(content)}`)
    .join('\n')
    .toLowerCase();

const addFinding = (findings, id, name, severity, description, points) => {
  findings.push({
    owasp_id: id,
    name,
    severity,
    endpoint: 'All',
    description,
    points,
  });
};

const includesAny = (source, patterns) => patterns.some((pattern) => pattern.test(source));

const run = async (currentCode, testReport = {}, spec = {}) => {
  const source = buildSourceBundle(currentCode);
  const vulnerabilities = [];
  let score = 100;

  const authRequired = spec?.auth?.type && spec.auth.type !== 'none';
  const testsPassed = Boolean(testReport?.passed);
  const failedTests = Number(testReport?.failedTests || 0);

  if (!testsPassed) {
    const penalty = Math.min(20, Math.max(6, failedTests * 3));
    score -= penalty;
    addFinding(
      vulnerabilities,
      'A09',
      'Functional test failures',
      failedTests > 3 ? 'high' : 'medium',
      `${failedTests || 'Some'} generated endpoint tests failed during sandbox execution.`,
      penalty,
    );
  }

  if (authRequired && !includesAny(source, [/jsonwebtoken/, /jwt/, /bearer\s+/, /api[-_]?key/])) {
    score -= 14;
    addFinding(
      vulnerabilities,
      'A02',
      'Authentication not enforced',
      'high',
      `Specification requires ${spec.auth.type} authentication, but generated code does not show token or API key enforcement.`,
      14,
    );
  }

  if (!includesAny(source, [/req\.user/, /user_id/, /owner/i, /tenant/i, /authorize/, /ownership/])) {
    score -= 10;
    addFinding(
      vulnerabilities,
      'A01',
      'Object ownership checks not detected',
      'medium',
      'Generated code does not visibly constrain resource access by authenticated user or tenant.',
      10,
    );
  }

  if (!includesAny(source, [/express-rate-limit/, /ratelimit/, /rate\s*limit/, /slowdown/])) {
    score -= 8;
    addFinding(
      vulnerabilities,
      'A04',
      'Rate limiting missing',
      'medium',
      'No global rate limiter was detected for generated API routes.',
      8,
    );
  }

  if (!includesAny(source, [/helmet\(/, /x-content-type-options/, /content-security-policy/])) {
    score -= 8;
    addFinding(
      vulnerabilities,
      'A08',
      'Security headers missing',
      'medium',
      'Generated service does not appear to configure common HTTP security headers.',
      8,
    );
  }

  if (!includesAny(source, [/zod/, /joi/, /yup/, /express-validator/, /validate/, /schema\.parse/])) {
    score -= 10;
    addFinding(
      vulnerabilities,
      'A03',
      'Input validation not detected',
      'high',
      'No request body validation library or validation middleware was detected.',
      10,
    );
  }

  if (includesAny(source, [/eval\(/, /new function\(/, /child_process/, /exec\(/, /spawn\(/])) {
    score -= 12;
    addFinding(
      vulnerabilities,
      'A10',
      'Unsafe runtime execution detected',
      'critical',
      'Generated code includes dynamic execution or process spawning primitives.',
      12,
    );
  }

  if (includesAny(source, [/cors\(\s*\)/, /origin:\s*['"]\*['"]/])) {
    score -= 5;
    addFinding(
      vulnerabilities,
      'A08',
      'Overly broad CORS policy',
      'low',
      'Generated code appears to allow unrestricted cross-origin requests.',
      5,
    );
  }

  if (includesAny(source, [/password\s*[:=]\s*['"][^'"]+['"]/, /secret\s*[:=]\s*['"][^'"]{8,}['"]/])) {
    score -= 10;
    addFinding(
      vulnerabilities,
      'A02',
      'Hardcoded credential material',
      'high',
      'Potential hardcoded secret or password value was detected in generated source.',
      10,
    );
  }

  if (!includesAny(source, [/dotenv/, /process\.env/, /\.env\.example/])) {
    score -= 4;
    addFinding(
      vulnerabilities,
      'A08',
      'Environment configuration missing',
      'low',
      'Generated service does not visibly load configuration from environment variables.',
      4,
    );
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    vulnerabilities,
    passed: score >= 85 && testsPassed,
  };
};

module.exports = { run };
