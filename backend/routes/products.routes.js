const router = require('express').Router();
const controller = require('../controllers/products.controller');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');

router.get('/', optionalAuth, controller.list);
router.get('/:id', controller.detail);
router.post('/', requireAuth, requireAdmin, controller.create);
router.put('/:id', requireAuth, requireAdmin, controller.update);
router.delete('/:id', requireAuth, requireAdmin, controller.remove);

module.exports = router;
