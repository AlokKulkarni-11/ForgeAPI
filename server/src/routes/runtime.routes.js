const express = require('express');
const {
  createRecord,
  deleteRecord,
  getRecords,
  getRuntimeOverview,
  replaceRecord,
  updateRecord,
} = require('../controllers/runtime.controller');

const router = express.Router();

router.get('/:apiId', getRuntimeOverview);
router.get('/:apiId/:collection', getRecords);
router.get('/:apiId/:collection/:id', getRecords);
router.post('/:apiId/:collection', createRecord);
router.put('/:apiId/:collection/:id', replaceRecord);
router.patch('/:apiId/:collection/:id', updateRecord);
router.delete('/:apiId/:collection/:id', deleteRecord);

module.exports = router;
