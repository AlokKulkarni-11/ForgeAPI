const { model } = require('../config/ai');
const { generateLocalProjectFiles } = require('../services/codegen.service');

const SYSTEM_PROMPT = `You are an expert backend developer. You generate complete, production-ready REST API code based on a specification JSON.

Rules:
- Generate ALL files needed: server entry point, route files, controller files, model/schema files, middleware, .env.example, README.md
- Code must be syntactically correct and immediately runnable
- Include proper error handling, status codes, and response formats
- Follow RESTful conventions strictly
- Include input validation
- Never use placeholders or TODO comments — everything must be complete

Output ONLY a valid JSON object where keys are file paths and values are complete file contents:
{"server.js": "...", "routes/book.js": "...", "models/Book.js": "...", "middleware/auth.js": "...", ".env.example": "...", "README.md": "..."}

No explanations. No markdown. Pure JSON only.`;

const stripCodeFences = (text) => {
  if (text.startsWith('```json')) {
    return text.slice(7, -3).trim();
  }

  if (text.startsWith('```')) {
    return text.slice(3, -3).trim();
  }

  return text;
};

const extensionByLanguage = {
  javascript: 'js',
  js: 'js',
  typescript: 'ts',
  ts: 'ts',
  tsx: 'tsx',
  jsx: 'jsx',
  json: 'json',
  markdown: 'md',
  md: 'md',
  bash: 'sh',
  sh: 'sh',
  shell: 'sh',
  env: 'env',
  yaml: 'yml',
  yml: 'yml',
  sql: 'sql',
  html: 'html',
  css: 'css',
};

const PROTECTED_GENERATED_FILES = [
  /^package\.json$/i,
  /^\.env\.example$/i,
  /^README\.md$/i,
  /^src\/index\.js$/i,
  /^src\/app\.js$/i,
  /^src\/routes\/.+\.routes\.js$/i,
  /^app\/__init__\.py$/i,
  /^app\/main\.py$/i,
  /^requirements\.txt$/i,
  /^forgeapi\/spec\.json$/i,
  /^runtime\/data\.json$/i,
];

const isProtectedGeneratedFile = (filepath = '') =>
  PROTECTED_GENERATED_FILES.some((pattern) => pattern.test(filepath));

const mergeGeneratedFiles = (fallbackFiles = {}, extractedFiles = {}) => {
  const mergedFiles = { ...fallbackFiles };

  for (const [filepath, content] of Object.entries(extractedFiles)) {
    if (isProtectedGeneratedFile(filepath) && Object.prototype.hasOwnProperty.call(fallbackFiles, filepath)) {
      if (String(fallbackFiles[filepath]) !== String(content)) {
        mergedFiles[`ai-recovered/${filepath}`] = content;
      }
      continue;
    }

    mergedFiles[filepath] = content;
  }

  return mergedFiles;
};

const normalizeFileMap = (value) => {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    return null;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return null;
  }

  const normalized = {};

  for (const [filepath, content] of entries) {
    if (typeof filepath !== 'string' || !filepath.trim()) {
      return null;
    }

    if (typeof content === 'string') {
      normalized[filepath.trim()] = content;
      continue;
    }

    if (content && typeof content === 'object' && typeof content.content === 'string') {
      normalized[filepath.trim()] = content.content;
      continue;
    }

    normalized[filepath.trim()] = JSON.stringify(content, null, 2);
  }

  return normalized;
};

const parseJsonCandidate = (text) => {
  if (!text) {
    return null;
  }

  try {
    return normalizeFileMap(JSON.parse(text));
  } catch {
    return null;
  }
};

const extractBalancedJsonObject = (text) => {
  let startIndex = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === '\\') {
      escaped = true;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === '{') {
      if (depth === 0) {
        startIndex = index;
      }
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && startIndex !== -1) {
        const candidate = text.slice(startIndex, index + 1);
        const parsed = parseJsonCandidate(candidate);
        if (parsed) {
          return parsed;
        }
        startIndex = -1;
      }
    }
  }

  return null;
};

const extractFilenameFromContext = (text, blockStartIndex, info = '', blockCode = '', blockNumber = 1) => {
  const infoParts = info.trim().split(/\s+/).filter(Boolean);
  const maybePathFromInfo = infoParts.find((part, index) => index > 0 && /[./\\]/.test(part));
  if (maybePathFromInfo) {
    return maybePathFromInfo.replace(/^['"`]|['"`]$/g, '');
  }

  const priorText = text.slice(0, blockStartIndex);
  const contextLines = priorText.split('\n').slice(-3).map((line) => line.trim()).filter(Boolean);
  const contextualLine = [...contextLines].reverse().find((line) =>
    /(^|\s)([A-Za-z0-9_./-]+\.(js|ts|tsx|jsx|json|md|env|sql|yml|yaml|html|css|sh))([`'":\s]|$)/i.test(line),
  );

  if (contextualLine) {
    const match = contextualLine.match(/([A-Za-z0-9_./-]+\.(js|ts|tsx|jsx|json|md|env|sql|yml|yaml|html|css|sh))/i);
    if (match) {
      return match[1];
    }
  }

  const firstCodeLine = blockCode.split('\n')[0]?.trim();
  const inlineFilenameMatch = firstCodeLine?.match(/^(\/\/|#)\s*([A-Za-z0-9_./-]+\.(js|ts|tsx|jsx|json|md|env|sql|yml|yaml|html|css|sh))/i);
  if (inlineFilenameMatch) {
    return inlineFilenameMatch[2];
  }

  const language = (infoParts[0] || '').toLowerCase();
  const extension = extensionByLanguage[language] || 'txt';
  return `recovered/file-${blockNumber}.${extension}`;
};

const extractCodeBlocks = (text) => {
  const codeBlockPattern = /```([^\n]*)\n([\s\S]*?)```/g;
  const files = {};
  const consumedRanges = [];
  let match;
  let blockNumber = 0;

  while ((match = codeBlockPattern.exec(text)) !== null) {
    blockNumber += 1;
    const [, info = '', code = ''] = match;
    const filepath = extractFilenameFromContext(text, match.index, info, code, blockNumber);
    let uniquePath = filepath;
    let duplicateIndex = 2;

    while (files[uniquePath]) {
      const dotIndex = filepath.lastIndexOf('.');
      uniquePath =
        dotIndex > 0
          ? `${filepath.slice(0, dotIndex)}-${duplicateIndex}${filepath.slice(dotIndex)}`
          : `${filepath}-${duplicateIndex}`;
      duplicateIndex += 1;
    }

    files[uniquePath] = code.trim();
    consumedRanges.push([match.index, match.index + match[0].length]);
  }

  if (Object.keys(files).length === 0) {
    return null;
  }

  let notes = '';
  let cursor = 0;
  for (const [start, end] of consumedRanges) {
    notes += text.slice(cursor, start);
    cursor = end;
  }
  notes += text.slice(cursor);

  const cleanedNotes = notes
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();

  if (cleanedNotes) {
    files['agent-output.notes.md'] = cleanedNotes;
  }

  return files;
};

const extractFileMap = (rawText) => {
  const direct = parseJsonCandidate(rawText.trim());
  if (direct) {
    return direct;
  }

  const stripped = stripCodeFences(rawText.trim());
  const strippedParsed = parseJsonCandidate(stripped);
  if (strippedParsed) {
    return strippedParsed;
  }

  const fencedJson = [...rawText.matchAll(/```json\s*([\s\S]*?)```/gi)]
    .map((match) => parseJsonCandidate(match[1].trim()))
    .find(Boolean);
  if (fencedJson) {
    return fencedJson;
  }

  const embeddedJson = extractBalancedJsonObject(rawText);
  if (embeddedJson) {
    return embeddedJson;
  }

  return extractCodeBlocks(rawText);
};

const run = async (spec, framework, currentCode, iteration) => {
  const prompt = `${SYSTEM_PROMPT}\n\nSPECIFICATION:\n${JSON.stringify(spec)}\nFRAMEWORK:\n${framework}\nCURRENT ITERATION:\n${iteration}${currentCode ? `\nPREVIOUS CODE:\n${JSON.stringify(currentCode)}` : ''}`;
  const fallbackFiles = generateLocalProjectFiles(spec, framework);

  try {
    const result = await model.generateContent(prompt);
    const rawText = result.response.text().trim();

    const extractedFiles = extractFileMap(rawText);
    if (extractedFiles) {
      return mergeGeneratedFiles(fallbackFiles, extractedFiles);
    }

    const text = stripCodeFences(rawText);
    console.error('Failed to parse generation JSON');
    return {
      ...fallbackFiles,
      'agent-output.raw.txt': rawText,
      'agent-output.cleaned.txt': text,
      'agent-output.error.txt': [
        'ForgeAPI could not parse the AI response into the expected file-map JSON.',
        '',
        `Iteration: ${iteration}`,
        `Framework: ${framework}`,
        'Recovered output did not match a valid JSON file map or named code blocks.',
        '',
        'The raw AI response has been preserved so it can be inspected in the workspace editor.',
      ].join('\n'),
    };
  } catch (agentError) {
    console.error('Generation agent request failed:', agentError);
    return {
      ...fallbackFiles,
      'agent-output.error.txt': [
        'ForgeAPI could not fetch a generation response from the AI provider.',
        '',
        `Iteration: ${iteration}`,
        `Framework: ${framework}`,
        `Provider error: ${agentError.message || String(agentError)}`,
        '',
        'Check the Gemini API key, quota, and backend logs, then generate a fresh API.',
      ].join('\n'),
      'agent-output.spec.json': JSON.stringify(spec, null, 2),
      'agent-output.request.txt': prompt,
      'agent-output.current-code.json': JSON.stringify(currentCode || {}, null, 2),
    };
  }
};

module.exports = { run };
