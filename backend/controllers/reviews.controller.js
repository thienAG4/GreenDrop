const reviewsService = require('../services/reviews.service');
const asyncHandler = require('../utils/async-handler');

// Exception (section 1.5.3): if the image upload fails, the review is still
// saved without it, so a missing file here is not an error condition.
function fileUrl(req) {
  if (!req.file) return null;
  const base = process.env.PUBLIC_UPLOADS_URL || '/uploads';
  return `${base}/reviews/${req.file.filename}`;
}

const create = asyncHandler(async (req, res) => {
  const review = await reviewsService.createReview(req.user.user_id, {
    ...req.body,
    image_url: fileUrl(req),
  });
  res.status(201).json({ data: review, message: 'Review submitted and awaiting approval' });
});

const listForProduct = asyncHandler(async (req, res) => {
  const reviews = await reviewsService.listForProduct(req.params.productId);
  res.json({ data: reviews });
});

const listMine = asyncHandler(async (req, res) => {
  const reviews = await reviewsService.listMine(req.user.user_id);
  res.json({ data: reviews });
});

const listAllAdmin = asyncHandler(async (req, res) => {
  const result = await reviewsService.listAllAdmin(req.query);
  res.json({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } });
});

const setVisibility = asyncHandler(async (req, res) => {
  await reviewsService.setVisibility(req.params.id, req.body.is_visible);
  res.json({ data: null, message: 'Review updated' });
});

module.exports = { create, listForProduct, listMine, listAllAdmin, setVisibility };
