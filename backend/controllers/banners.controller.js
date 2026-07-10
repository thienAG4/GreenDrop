const bannersService = require('../services/banners.service');
const asyncHandler = require('../utils/async-handler');

const listActive = asyncHandler(async (req, res) => {
  const banners = await bannersService.listActiveBanners();
  res.json({ data: banners });
});

const listAll = asyncHandler(async (req, res) => {
  const banners = await bannersService.listAllBanners();
  res.json({ data: banners });
});

const create = asyncHandler(async (req, res) => {
  const banner = await bannersService.createBanner(req.user.user_id, req.body);
  res.status(201).json({ data: banner, message: 'Banner created' });
});

const update = asyncHandler(async (req, res) => {
  const banner = await bannersService.updateBanner(req.params.id, req.body);
  res.json({ data: banner, message: 'Banner updated' });
});

const remove = asyncHandler(async (req, res) => {
  await bannersService.deleteBanner(req.params.id);
  res.json({ data: null, message: 'Banner deleted' });
});

module.exports = { listActive, listAll, create, update, remove };
