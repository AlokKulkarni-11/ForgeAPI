const path = require('path');

function slugify(value = 'resource') {
  return String(value || 'resource')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'resource';
}

function pluralize(value = 'resource') {
  const base = slugify(value);

  if (base.endsWith('ies')) {
    return base;
  }

  if (base.endsWith('y')) {
    return `${base.slice(0, -1)}ies`;
  }

  return base.endsWith('s') ? base : `${base}s`;
}

function toIdentifier(value = 'resource') {
  const cleaned = String(value || 'resource')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'resource';
  }

  const [first, ...rest] = cleaned.split(/\s+/);
  return [first.toLowerCase(), ...rest.map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())].join('');
}

function toPascalCase(value = 'Resource') {
  return String(value || 'Resource')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join('') || 'Resource';
}

function buildRuntimeData(entities = []) {
  return entities.reduce((acc, entity) => {
    acc[pluralize(entity.name)] = [];
    return acc;
  }, {});
}

function buildExpressFiles(spec = {}) {
  const entities = Array.isArray(spec.entities) ? spec.entities : [];
  const runtimeData = buildRuntimeData(entities);
  const routeImports = entities
    .map((entity) => {
      const collection = pluralize(entity.name);
      return `app.use('/${collection}', require('./routes/${collection}.routes'));`;
    })
    .join('\n');

  const routeFiles = Object.fromEntries(
    entities.map((entity) => {
      const className = toPascalCase(entity.name);
      const entityKey = toIdentifier(entity.name);
      const collection = pluralize(entity.name);
      const fieldSample = (Array.isArray(entity.fields) ? entity.fields : [])
        .map((field) => `//   ${JSON.stringify(field.name)}: ${JSON.stringify(field.type)}`)
        .join(',\n');

      const content = `const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const ${entityKey}Store = [];

router.get('/', (_req, res) => {
  res.json(${entityKey}Store);
});

router.get('/:id', (req, res) => {
  const record = ${entityKey}Store.find((item) => item.id === req.params.id);

  if (!record) {
    return res.status(404).json({ error: '${className} not found' });
  }

  return res.json(record);
});

router.post('/', (req, res) => {
  const record = {
    id: crypto.randomUUID(),
    ...req.body,
  };

  ${entityKey}Store.push(record);
  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const index = ${entityKey}Store.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '${className} not found' });
  }

  ${entityKey}Store[index] = {
    ...req.body,
    id: req.params.id,
  };

  return res.json(${entityKey}Store[index]);
});

router.patch('/:id', (req, res) => {
  const index = ${entityKey}Store.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '${className} not found' });
  }

  ${entityKey}Store[index] = {
    ...${entityKey}Store[index],
    ...req.body,
    id: req.params.id,
  };

  return res.json(${entityKey}Store[index]);
});

router.delete('/:id', (req, res) => {
  const index = ${entityKey}Store.findIndex((item) => item.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '${className} not found' });
  }

  ${entityKey}Store.splice(index, 1);
  return res.json({ success: true });
});

module.exports = router;

// Schema reference:
// ${className}
// {
${fieldSample || '//   "id": "uuid"'}
// }
`;

      return [path.posix.join('src', 'routes', `${collection}.routes.js`), content];
    }),
  );

  return {
    'package.json': JSON.stringify(
      {
        name: slugify(spec.apiName || 'forgeapi-app'),
        version: '1.0.0',
        private: true,
        type: 'commonjs',
        scripts: {
          dev: 'node src/index.js',
          start: 'node src/index.js',
        },
        dependencies: {
          cors: '^2.8.5',
          dotenv: '^16.4.7',
          express: '^4.21.2',
        },
      },
      null,
      2,
    ),
    '.env.example': ['PORT=3000', 'NODE_ENV=development'].join('\n'),
    'README.md': [
      `# ${spec.apiName || 'Generated API'}`,
      '',
      spec.description || 'Generated locally by ForgeAPI fallback codegen.',
      '',
      '## Run',
      '',
      '```bash',
      'npm install',
      'npm run dev',
      '```',
      '',
      '## Entities',
      '',
      ...entities.map((entity) => `- ${entity.name}: ${(entity.fields || []).map((field) => `${field.name}:${field.type}`).join(', ') || 'no fields'}`),
    ].join('\n'),
    'src/index.js': `require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(\`Generated API running on port \${port}\`);
});
`,
    'src/app.js': `const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', api: ${JSON.stringify(spec.apiName || 'Generated API')} });
});

${routeImports || '// No entity routes were generated.'}

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

module.exports = app;
`,
    'forgeapi/spec.json': JSON.stringify(spec, null, 2),
    'runtime/data.json': JSON.stringify(runtimeData, null, 2),
    ...routeFiles,
  };
}

function buildFastApiFiles(spec = {}) {
  const entities = Array.isArray(spec.entities) ? spec.entities : [];
  const runtimeData = buildRuntimeData(entities);
  const routeBlocks = entities
    .map((entity) => {
      const className = toPascalCase(entity.name);
      const schemaFields = (entity.fields || [])
        .map((field) => `    ${field.name}: ${field.type === 'number' ? 'float | None = None' : field.type === 'boolean' ? 'bool | None = None' : 'str | None = None'}`)
        .join('\n');
      const collection = pluralize(entity.name);

      return `
class ${className}(BaseModel):
${schemaFields || '    name: str | None = None'}


${collection}_store: list[dict] = []


@app.get("/${collection}")
def list_${collection}():
    return ${collection}_store


@app.get("/${collection}/{item_id}")
def get_${collection}(item_id: str):
    for item in ${collection}_store:
        if item["id"] == item_id:
            return item
    raise HTTPException(status_code=404, detail="${className} not found")


@app.post("/${collection}", status_code=201)
def create_${collection}(payload: ${className}):
    item = {"id": str(uuid4()), **payload.model_dump(exclude_none=True)}
    ${collection}_store.append(item)
    return item


@app.put("/${collection}/{item_id}")
def replace_${collection}(item_id: str, payload: ${className}):
    for index, item in enumerate(${collection}_store):
        if item["id"] == item_id:
            ${collection}_store[index] = {"id": item_id, **payload.model_dump(exclude_none=True)}
            return ${collection}_store[index]
    raise HTTPException(status_code=404, detail="${className} not found")


@app.patch("/${collection}/{item_id}")
def update_${collection}(item_id: str, payload: ${className}):
    for index, item in enumerate(${collection}_store):
        if item["id"] == item_id:
            ${collection}_store[index] = {**item, **payload.model_dump(exclude_none=True), "id": item_id}
            return ${collection}_store[index]
    raise HTTPException(status_code=404, detail="${className} not found")


@app.delete("/${collection}/{item_id}")
def delete_${collection}(item_id: str):
    for index, item in enumerate(${collection}_store):
        if item["id"] == item_id:
            ${collection}_store.pop(index)
            return {"success": True}
    raise HTTPException(status_code=404, detail="${className} not found")
`;
    })
    .join('\n');

  return {
    'requirements.txt': ['fastapi==0.116.1', 'uvicorn==0.35.0', 'pydantic==2.11.7'].join('\n'),
    '.env.example': 'PORT=8000',
    'README.md': [
      `# ${spec.apiName || 'Generated API'}`,
      '',
      spec.description || 'Generated locally by ForgeAPI fallback codegen.',
      '',
      '## Run',
      '',
      '```bash',
      'pip install -r requirements.txt',
      'uvicorn app.main:app --reload --port 8000',
      '```',
    ].join('\n'),
    'app/__init__.py': '',
    'app/main.py': `from uuid import uuid4

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title=${JSON.stringify(spec.apiName || 'Generated API')})


@app.get("/health")
def health():
    return {"status": "ok", "api": ${JSON.stringify(spec.apiName || 'Generated API')}}
${routeBlocks}
`,
    'forgeapi/spec.json': JSON.stringify(spec, null, 2),
    'runtime/data.json': JSON.stringify(runtimeData, null, 2),
  };
}

function generateLocalProjectFiles(spec = {}, framework = 'nodejs') {
  if (String(framework).toLowerCase() === 'fastapi') {
    return buildFastApiFiles(spec);
  }

  return buildExpressFiles(spec);
}

module.exports = {
  generateLocalProjectFiles,
  pluralize,
  slugify,
};
