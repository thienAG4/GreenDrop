const router = require('express').Router();
const controller = require('../controllers/dashboard.controller');
const { requireAuth, requireStaff } = require('../middleware/auth');

router.get('/stats', requireAuth, requireStaff, controller.getStats);

module.exports = router;
