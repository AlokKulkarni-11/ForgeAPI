// scripts/run_generation.js
const fs = require('fs');
const path = require('path');
const generationAgent = require('../server/src/agents/generationAgent');

// Load sample spec
const specPath = path.resolve(__dirname, '../tmp/sample_spec.json');
if (!fs.existsSync(specPath)) {
  console.error('Sample spec not found at', specPath);
  process.exit(1);
}
const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));

// Determine framework (nodejs) – could be derived from spec
const framework = spec.framework || 'nodejs';

(async () => {
  try {
    const generatedFiles = await generationAgent.run(spec, framework, null, 0);
    if (!generatedFiles || typeof generatedFiles !== 'object') {
      console.error('Generation returned no files');
      process.exit(1);
    }
    const outputDir = path.resolve(__dirname, '../generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    // Write each file
    for (const [relativePath, content] of Object.entries(generatedFiles)) {
      const filePath = path.join(outputDir, relativePath);
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log('Generated', filePath);
    }
    console.log('Generation complete. Files written to', outputDir);
  } catch (err) {
    console.error('Error during generation:', err);
    process.exit(1);
  }
})();
