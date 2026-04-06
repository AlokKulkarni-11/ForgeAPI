const { model } = require('../config/ai');

const SYSTEM_PROMPT = `You are a senior backend security engineer. You receive:
1. The original generated API code (all files)
2. The OWASP security report with specific vulnerabilities
3. The failed test cases

Your job is to fix ALL identified issues and return the complete corrected codebase.

Rules:
- Fix every vulnerability listed in the OWASP report
- Fix every failing test case
- Do NOT change working functionality
- Add missing security middleware (helmet, rate-limiting, input sanitization)
- All fixes must be complete — no partial patches

Output ONLY valid JSON with the same file structure as input, containing the corrected files.`;

const run = async (healContext, spec) => {
  const prompt = `${SYSTEM_PROMPT}\n\nCONTEXT:\n${JSON.stringify(healContext)}\n\nSPEC:\n${JSON.stringify(spec)}`;
  
  const result = await model.generateContent(prompt);
  let text = result.response.text().trim();
  if (text.startsWith('\`\`\`json')) text = text.slice(7, -3);
  else if (text.startsWith('\`\`\`')) text = text.slice(3, -3);
  
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Healing agent output parse error.");
    return healContext.currentCode;
  }
};

module.exports = { run };
