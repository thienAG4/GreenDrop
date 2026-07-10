const router = require('express').Router();
const controller = require('../controllers/promotions.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/', controller.listActive);
router.get('/all', requireAuth, requireAdmin, controller.listAll);
router.post('/', requireAuth, requireAdmin, controller.create);
router.put('/:id', requireAuth, requireAdmin, controller.update);
router.delete('/:id', requireAuth, requireAdmin, controller.remove);

module.exports = router;
