const router = require('express').Router();
const controller = require('../controllers/blog.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.get('/admin', requireAuth, requireAdmin, controller.listAllAdmin);
router.get('/admin/:id', requireAuth, requireAdmin, controller.getByIdAdmin);
router.get('/', controller.listPublished);
router.get('/:slug', controller.getBySlug);
router.post('/', requireAuth, requireAdmin, controller.create);
router.put('/:id', requireAuth, requireAdmin, controller.update);
router.delete('/:id', requireAuth, requireAdmin, controller.remove);

module.exports = router;
