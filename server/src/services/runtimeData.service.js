const { randomUUID } = require('crypto');
const supabase = require('../config/supabase');
const { pluralize } = require('./codegen.service');
const { inferApiDesign } = require('./specInference.service');

const RUNTIME_FILEPATH = 'runtime/data.json';

function createEmptyRuntimeData(entities = []) {
  return (Array.isArray(entities) ? entities : []).reduce((acc, entity) => {
    acc[pluralize(entity.name)] = [];
    return acc;
  }, {});
}

function legacyPluralize(value = 'resource') {
  const base = String(value || 'resource')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'resource';

  return base.endsWith('s') ? base : `${base}s`;
}

function alignRuntimeDataToEntities(data = {}, entities = []) {
  const incoming = data && typeof data === 'object' ? data : {};
  const aligned = { ...incoming };
  let changed = false;

  for (const entity of Array.isArray(entities) ? entities : []) {
    const canonicalKey = pluralize(entity.name);
    const legacyKey = legacyPluralize(entity.name);

    if (!Array.isArray(aligned[canonicalKey])) {
      if (canonicalKey !== legacyKey && Array.isArray(aligned[legacyKey])) {
        aligned[canonicalKey] = aligned[legacyKey];
        delete aligned[legacyKey];
        changed = true;
      } else {
        aligned[canonicalKey] = [];
        changed = true;
      }
    }
  }

  return { data: aligned, changed };
}

async function getRequirements(apiId) {
  const { data, error } = await supabase
    .from('api_requirements')
    .select('entities, endpoints')
    .eq('api_id', apiId)
    .single();

  if (error) {
    throw error;
  }

  const normalized = inferApiDesign({
    entities: Array.isArray(data?.entities) ? data.entities : [],
    endpoints: Array.isArray(data?.endpoints) ? data.endpoints : [],
  });

  return {
    entities: normalized.entities,
    endpoints: normalized.endpoints,
  };
}

async function getRuntimeFile(apiId) {
  const { data, error } = await supabase
    .from('api_files')
    .select('content')
    .eq('api_id', apiId)
    .eq('filepath', RUNTIME_FILEPATH)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function saveRuntimeData(apiId, data) {
  const content = JSON.stringify(data, null, 2);
  const { error: deleteError } = await supabase
    .from('api_files')
    .delete()
    .eq('api_id', apiId)
    .eq('filepath', RUNTIME_FILEPATH);

  if (deleteError) {
    throw deleteError;
  }

  const { error } = await supabase.from('api_files').insert([
    {
      api_id: apiId,
      filename: 'data.json',
      filepath: RUNTIME_FILEPATH,
      content,
    },
  ]);

  if (error) {
    throw error;
  }

  return data;
}

async function loadRuntimeContext(apiId) {
  const requirements = await getRequirements(apiId);
  const runtimeFile = await getRuntimeFile(apiId);
  let data = createEmptyRuntimeData(requirements.entities);
  let shouldPersist = false;

  if (runtimeFile?.content) {
    try {
      data = JSON.parse(runtimeFile.content);
      const aligned = alignRuntimeDataToEntities(data, requirements.entities);
      data = aligned.data;
      shouldPersist = aligned.changed;
    } catch {
      data = createEmptyRuntimeData(requirements.entities);
      shouldPersist = true;
    }
  } else {
    shouldPersist = true;
  }

  if (shouldPersist) {
    await saveRuntimeData(apiId, data);
  }

  return {
    ...requirements,
    data,
  };
}

function normalizeCollectionKey(value) {
  return pluralize(value);
}

function findEntityForCollection(entities = [], collection) {
  return entities.find((entity) => pluralize(entity.name) === normalizeCollectionKey(collection)) || null;
}

function buildSampleRecord(entity = {}) {
  const fields = Array.isArray(entity.fields) ? entity.fields : [];

  return fields.reduce(
    (acc, field) => {
      if (field.name === 'id') {
        return acc;
      }

      switch (field.type) {
        case 'number':
          acc[field.name] = 42;
          break;
        case 'boolean':
          acc[field.name] = true;
          break;
        case 'date':
          acc[field.name] = new Date().toISOString();
          break;
        case 'uuid':
          acc[field.name] = randomUUID();
          break;
        default:
          acc[field.name] = `${field.name}-sample`;
      }

      return acc;
    },
    { id: randomUUID() },
  );
}

module.exports = {
  RUNTIME_FILEPATH,
  buildSampleRecord,
  createEmptyRuntimeData,
  findEntityForCollection,
  loadRuntimeContext,
  normalizeCollectionKey,
  saveRuntimeData,
};
