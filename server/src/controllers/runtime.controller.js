const { randomUUID } = require('crypto');
const {
  findEntityForCollection,
  loadRuntimeContext,
  normalizeCollectionKey,
  saveRuntimeData,
} = require('../services/runtimeData.service');

async function getRuntimeOverview(req, res) {
  try {
    const { apiId } = req.params;
    const { entities, endpoints, data } = await loadRuntimeContext(apiId);

    res.json({
      apiId,
      collections: Object.keys(data),
      entities,
      endpoints,
    });
  } catch (error) {
    console.error('Runtime overview error:', error);
    res.status(500).json({ error: 'Failed to load runtime API' });
  }
}

async function getRecords(req, res) {
  try {
    const { apiId, collection, id } = req.params;
    const { entities, data } = await loadRuntimeContext(apiId);
    const collectionKey = normalizeCollectionKey(collection);
    const entity = findEntityForCollection(entities, collectionKey);

    if (!entity || !Array.isArray(data[collectionKey])) {
      return res.status(404).json({ error: `Collection "${collection}" not found` });
    }

    if (id) {
      const record = data[collectionKey].find((item) => item.id === id);

      if (!record) {
        return res.status(404).json({ error: `${entity.name} not found` });
      }

      return res.json(record);
    }

    return res.json(data[collectionKey]);
  } catch (error) {
    console.error('Runtime get records error:', error);
    res.status(500).json({ error: 'Failed to fetch runtime records' });
  }
}

async function createRecord(req, res) {
  try {
    const { apiId, collection } = req.params;
    const { entities, data } = await loadRuntimeContext(apiId);
    const collectionKey = normalizeCollectionKey(collection);
    const entity = findEntityForCollection(entities, collectionKey);

    if (!entity || !Array.isArray(data[collectionKey])) {
      return res.status(404).json({ error: `Collection "${collection}" not found` });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const record = {
      id: randomUUID(),
      ...req.body,
    };

    data[collectionKey].push(record);
    await saveRuntimeData(apiId, data);
    return res.status(201).json(record);
  } catch (error) {
    console.error('Runtime create record error:', error);
    res.status(500).json({ error: 'Failed to create runtime record' });
  }
}

async function replaceRecord(req, res) {
  try {
    const { apiId, collection, id } = req.params;
    const { entities, data } = await loadRuntimeContext(apiId);
    const collectionKey = normalizeCollectionKey(collection);
    const entity = findEntityForCollection(entities, collectionKey);

    if (!entity || !Array.isArray(data[collectionKey])) {
      return res.status(404).json({ error: `Collection "${collection}" not found` });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const index = data[collectionKey].findIndex((item) => item.id === id);

    if (index === -1) {
      return res.status(404).json({ error: `${entity.name} not found` });
    }

    data[collectionKey][index] = {
      id,
      ...req.body,
    };

    await saveRuntimeData(apiId, data);
    return res.json(data[collectionKey][index]);
  } catch (error) {
    console.error('Runtime replace record error:', error);
    res.status(500).json({ error: 'Failed to replace runtime record' });
  }
}

async function updateRecord(req, res) {
  try {
    const { apiId, collection, id } = req.params;
    const { entities, data } = await loadRuntimeContext(apiId);
    const collectionKey = normalizeCollectionKey(collection);
    const entity = findEntityForCollection(entities, collectionKey);

    if (!entity || !Array.isArray(data[collectionKey])) {
      return res.status(404).json({ error: `Collection "${collection}" not found` });
    }

    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({ error: 'Request body must be a JSON object' });
    }

    const index = data[collectionKey].findIndex((item) => item.id === id);

    if (index === -1) {
      return res.status(404).json({ error: `${entity.name} not found` });
    }

    data[collectionKey][index] = {
      ...data[collectionKey][index],
      ...req.body,
      id,
    };

    await saveRuntimeData(apiId, data);
    return res.json(data[collectionKey][index]);
  } catch (error) {
    console.error('Runtime update record error:', error);
    res.status(500).json({ error: 'Failed to update runtime record' });
  }
}

async function deleteRecord(req, res) {
  try {
    const { apiId, collection, id } = req.params;
    const { entities, data } = await loadRuntimeContext(apiId);
    const collectionKey = normalizeCollectionKey(collection);
    const entity = findEntityForCollection(entities, collectionKey);

    if (!entity || !Array.isArray(data[collectionKey])) {
      return res.status(404).json({ error: `Collection "${collection}" not found` });
    }

    const index = data[collectionKey].findIndex((item) => item.id === id);

    if (index === -1) {
      return res.status(404).json({ error: `${entity.name} not found` });
    }

    data[collectionKey].splice(index, 1);
    await saveRuntimeData(apiId, data);
    return res.json({ success: true });
  } catch (error) {
    console.error('Runtime delete record error:', error);
    res.status(500).json({ error: 'Failed to delete runtime record' });
  }
}

module.exports = {
  createRecord,
  deleteRecord,
  getRecords,
  getRuntimeOverview,
  replaceRecord,
  updateRecord,
};
