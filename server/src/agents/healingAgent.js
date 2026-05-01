const { model } = require('../config/ai');

const SYSTEM_PROMPT = `You are a senior backend security engineer. You receive:
1. The original generated API code as a file map
2. The OWASP security report with specific vulnerabilities
3. The failed test cases

Your job is to fix ALL identified issues and return the complete corrected codebase.

Rules:
- Return the same JSON file-map shape: {"path/to/file.js":"complete file content"}
- Fix every vulnerability listed in the OWASP report
- Fix every failing test case
- Do not remove working endpoints or change route paths
- Add practical security controls using built-in code or listed dependencies: security headers, rate limiting, body validation, auth middleware when required
- Keep the project immediately runnable
- No markdown, no explanations, no partial patches

Output ONLY valid JSON.`;

const stripCodeFences = (text) => {
  const trimmed = String(text || '').trim();

  if (trimmed.startsWith('```json')) {
    return trimmed.slice(7, -3).trim();
  }

  if (trimmed.startsWith('```')) {
    return trimmed.slice(3, -3).trim();
  }

  return trimmed;
};

const normalizeFileMap = (value) => {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return null;
  }

  return entries.reduce((files, [filepath, content]) => {
    if (!filepath || typeof filepath !== 'string') {
      return files;
    }

    files[filepath] =
      typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    return files;
  }, {});
};

const parseFileMap = (rawText) => {
  const candidates = [rawText, stripCodeFences(rawText)];

  for (const candidate of candidates) {
    try {
      const parsed = normalizeFileMap(JSON.parse(candidate));
      if (parsed) {
        return parsed;
      }
    } catch {
      // Try the next candidate.
    }
  }

  const objectMatch = String(rawText || '').match(/\{[\s\S]*\}/);
  if (objectMatch) {
    try {
      return normalizeFileMap(JSON.parse(objectMatch[0]));
    } catch {
      return null;
    }
  }

  return null;
};

const run = async (healContext, spec) => {
  const prompt = `${SYSTEM_PROMPT}\n\nCONTEXT:\n${JSON.stringify(healContext)}\n\nSPEC:\n${JSON.stringify(spec)}`;

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();
    const healedCode = parseFileMap(rawText);

    if (healedCode) {
      return healedCode;
    }

    console.error('Healing agent output parse error.');
    return healContext.currentCode;
  } catch (err) {
    console.error('Healing agent request failed:', err);
    return healContext.currentCode;
  }
};

module.exports = { run };
