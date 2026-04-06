const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const { getUserProfile, updateUserProfile } = require('../controllers/user.controller');

router.use(requireAuth);

router.get('/profile', getUserProfile);
router.put('/profile', updateUserProfile);

module.exports = router;
