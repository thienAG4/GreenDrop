const router = require('express').Router();
const controller = require('../controllers/orders.controller');
const { optionalAuth, requireAuth, requireStaff } = require('../middleware/auth');

router.post('/', optionalAuth, controller.checkout);
router.get('/track', controller.track);
router.get('/mine', requireAuth, controller.mine);
router.get('/admin', requireAuth, requireStaff, controller.adminList);
router.get('/admin/stats', requireAuth, requireStaff, controller.adminStats);
router.get('/:id', optionalAuth, controller.detail);
router.post('/:id/payment/confirm', controller.confirmPayment);
router.post('/:id/cancel', requireAuth, controller.cancel);
router.post('/:id/status', requireAuth, requireStaff, controller.updateStatus);
router.post('/:id/admin-cancel', requireAuth, requireStaff, controller.adminCancel);

module.exports = router;
