const router = require('express').Router();
const controller = require('../controllers/uploads.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { makeUploader } = require('../middleware/upload');

const uploadProductImages = makeUploader('products');
const uploadBannerImages = makeUploader('banners');
const uploadBlogImages = makeUploader('blog');

function tagSubfolder(subfolder) {
  return (req, res, next) => {
    req.uploadSubfolder = subfolder;
    next();
  };
}

router.post(
  '/products',
  requireAuth,
  requireAdmin,
  tagSubfolder('products'),
  uploadProductImages.array('images', 6),
  controller.uploadImages
);
router.post(
  '/banners',
  requireAuth,
  requireAdmin,
  tagSubfolder('banners'),
  uploadBannerImages.array('images', 1),
  controller.uploadImages
);
router.post(
  '/blog',
  requireAuth,
  requireAdmin,
  tagSubfolder('blog'),
  uploadBlogImages.array('images', 1),
  controller.uploadImages
);

module.exports = router;
