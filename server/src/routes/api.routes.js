const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const {
  getUserApis,
  deleteApi,
  createApi,
  getApiById,
  getApiPipeline,
  testApiRequest,
  runAutoTestSuite,
  exportZip,
  exportGithub
} = require('../controllers/api.controller');

router.use(requireAuth);

router.get('/', getUserApis);
router.delete('/:id', deleteApi);
router.post('/', createApi);
router.get('/:id/pipeline', getApiPipeline);
router.get('/:id', getApiById);
router.post('/:id/test-request', testApiRequest);
router.post('/:id/test-suite', runAutoTestSuite);
router.get('/:id/export/zip', exportZip);
router.post('/:id/export/github', exportGithub);

module.exports = router;
