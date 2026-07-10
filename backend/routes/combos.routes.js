const router = require('express').Router();
const controller = require('../controllers/combos.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// AI preview generation doesn't persist anything, so it's open to any signed-in
// user; the frontend still lets guests play with the builder client-side only.
router.post('/ai-preview', requireAuth, controller.aiPreview);

// Public community catalog of saved designs - open to guests and customers.
router.get('/', controller.listPublic);
router.get('/mine', requireAuth, controller.listMine);
// Must come before /:id so 'admin' isn't parsed as a combo id.
router.get('/admin', requireAuth, requireAdmin, controller.listAllAdmin);
router.get('/:id', controller.detail);
router.post('/', requireAuth, controller.create);
router.put('/:id', requireAuth, controller.update);
router.delete('/:id', requireAuth, controller.remove);

module.exports = router;
