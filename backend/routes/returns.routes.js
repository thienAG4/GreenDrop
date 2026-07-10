const router = require('express').Router();
const controller = require('../controllers/returns.controller');
const { requireAuth, requireStaff } = require('../middleware/auth');
const { makeUploader } = require('../middleware/upload');

const uploadEvidence = makeUploader('returns');

router.get('/mine', requireAuth, controller.listMine);
router.get('/refunds', requireAuth, requireStaff, controller.listRefunds);
router.post('/refunds/:refundId/retry', requireAuth, requireStaff, controller.retryRefund);
router.get('/all', requireAuth, requireStaff, controller.listAll);
router.get('/:id', requireAuth, controller.detail);
router.post('/', requireAuth, uploadEvidence.array('evidence', 6), controller.create);
router.post('/:id/approve', requireAuth, requireStaff, controller.approve);
router.post('/:id/reject', requireAuth, requireStaff, controller.reject);
router.post('/:id/item-received', requireAuth, requireStaff, controller.itemReceived);
router.post('/:id/tracking', requireAuth, controller.submitTracking);

module.exports = router;
