const productsService = require('../services/products.service');
const asyncHandler = require('../utils/async-handler');

const list = asyncHandler(async (req, res) => {
  const isAdminView = req.user && ['admin', 'staff'].includes(req.user.role) && req.query.admin === 'true';
  const result = await productsService.listProducts({ ...req.query, includeInactive: isAdminView });
  res.json({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } });
});

const detail = asyncHandler(async (req, res) => {
  const product = await productsService.getProductDetail(req.params.id);
  res.json({ data: product });
});

const create = asyncHandler(async (req, res) => {
  const product = await productsService.createProduct(req.body);
  res.status(201).json({ data: product, message: 'Product created' });
});

const update = asyncHandler(async (req, res) => {
  const product = await productsService.updateProduct(req.params.id, req.body);
  res.json({ data: product, message: 'Product updated' });
});

const remove = asyncHandler(async (req, res) => {
  await productsService.deleteProduct(req.params.id);
  res.json({ data: null, message: 'Product deleted' });
});

module.exports = { list, detail, create, update, remove };
