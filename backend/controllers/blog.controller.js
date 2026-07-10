const blogService = require('../services/blog.service');
const asyncHandler = require('../utils/async-handler');

const listPublished = asyncHandler(async (req, res) => {
  const posts = await blogService.listPublished();
  res.json({ data: posts });
});

const getBySlug = asyncHandler(async (req, res) => {
  const post = await blogService.getBySlug(req.params.slug);
  res.json({ data: post });
});

const listAllAdmin = asyncHandler(async (req, res) => {
  const result = await blogService.listAllAdmin(req.query);
  res.json({ data: result.items, meta: { total: result.total, page: result.page, limit: result.limit } });
});

const getByIdAdmin = asyncHandler(async (req, res) => {
  const post = await blogService.getByIdAdmin(req.params.id);
  res.json({ data: post });
});

const create = asyncHandler(async (req, res) => {
  const post = await blogService.createPost(req.user.user_id, req.body);
  res.status(201).json({ data: post, message: 'Blog post created' });
});

const update = asyncHandler(async (req, res) => {
  const post = await blogService.updatePost(req.params.id, req.body);
  res.json({ data: post, message: 'Blog post updated' });
});

const remove = asyncHandler(async (req, res) => {
  await blogService.deletePost(req.params.id);
  res.json({ data: null, message: 'Blog post deleted' });
});

module.exports = { listPublished, getBySlug, listAllAdmin, getByIdAdmin, create, update, remove };
