const router = require('express').Router();
const controller = require('../controllers/reviews.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../middleware/upload');

const uploadReviewImage = makeUploader('reviews');

router.get('/product/:productId', controller.listForProduct);
router.get('/mine', requireAuth, controller.listMine);
router.get('/admin', requireAuth, requireAdmin, controller.listAllAdmin);
router.post('/', requireAuth, uploadReviewImage.single('image'), controller.create);
router.put('/:id/visibility', requireAuth, requireAdmin, controller.setVisibility);

module.exports = router;
