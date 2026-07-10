const categoriesService = require('../services/categories.service');
const asyncHandler = require('../utils/async-handler');

const list = asyncHandler(async (req, res) => {
  const categories = await categoriesService.listCategories();
  res.json({ data: categories });
});

const create = asyncHandler(async (req, res) => {
  const category = await categoriesService.createCategory(req.body);
  res.status(201).json({ data: category, message: 'Category created' });
});

const update = asyncHandler(async (req, res) => {
  const category = await categoriesService.updateCategory(req.params.id, req.body);
  res.json({ data: category, message: 'Category updated' });
});

const remove = asyncHandler(async (req, res) => {
  await categoriesService.deleteCategory(req.params.id);
  res.json({ data: null, message: 'Category deleted' });
});

module.exports = { list, create, update, remove };
