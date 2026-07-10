const router = require('express').Router();
const controller = require('../controllers/audit-logs.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', requireAuth, requireAdmin, controller.list);

module.exports = router;
