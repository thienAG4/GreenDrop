const router = require('express').Router();
const controller = require('../controllers/vouchers.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/check/:code', controller.check);
router.get('/active', controller.listActive);

router.get('/', requireAuth, requireAdmin, controller.list);
router.post('/', requireAuth, requireAdmin, controller.create);
router.put('/:id', requireAuth, requireAdmin, controller.update);
router.delete('/:id', requireAuth, requireAdmin, controller.remove);

module.exports = router;
