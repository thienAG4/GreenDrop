const db = require('../config/db');
const HttpError = require('../utils/http-error');

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function listPublished() {
  const [rows] = await db.query(
    `SELECT * FROM BLOG_POSTS WHERE status = 'published' ORDER BY created_at DESC`
  );
  return rows;
}

async function getBySlug(slug) {
  const [rows] = await db.query('SELECT * FROM BLOG_POSTS WHERE slug = ?', [slug]);
  if (!rows.length) throw new HttpError(404, 'Blog post not found');
  return rows[0];
}

async function listAllAdmin({ page = 1, limit = 20 } = {}) {
  const pageSize = Math.min(Number(limit) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * pageSize;
  const [rows] = await db.query(
    `SELECT * FROM BLOG_POSTS ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  const [[{ total }]] = await db.query('SELECT COUNT(*) AS total FROM BLOG_POSTS');
  return { items: rows, total, page: Number(page) || 1, limit: pageSize };
}

async function getByIdAdmin(id) {
  const [rows] = await db.query('SELECT * FROM BLOG_POSTS WHERE post_id = ?', [id]);
  if (!rows.length) throw new HttpError(404, 'Blog post not found');
  return rows[0];
}

function validateInput({ title, content }, { partial = false } = {}) {
  if (!partial || title !== undefined) {
    if (!title) throw new HttpError(400, 'Title is required');
  }
  if (!partial || content !== undefined) {
    if (!content) throw new HttpError(400, 'Content is required');
  }
}

async function createPost(adminUserId, body) {
  validateInput(body);
  const { title, excerpt, content, image_url, author, status = 'draft' } = body;
  const baseSlug = slugify(title);
  let slug = baseSlug;
  let suffix = 1;
  while (true) {
    const [dup] = await db.query('SELECT post_id FROM BLOG_POSTS WHERE slug = ?', [slug]);
    if (!dup.length) break;
    suffix += 1;
    slug = `${baseSlug}-${suffix}`;
  }

  const [result] = await db.query(
    `INSERT INTO BLOG_POSTS (slug, title, excerpt, content, image_url, author, status, created_by_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [slug, title, excerpt || null, content, image_url || null, author || null, status, adminUserId]
  );
  return getByIdAdmin(result.insertId);
}

async function updatePost(id, body) {
  validateInput(body, { partial: true });
  const existing = await getByIdAdmin(id);

  let slug = existing.slug;
  if (body.title && body.title !== existing.title) {
    const baseSlug = slugify(body.title);
    slug = baseSlug;
    let suffix = 1;
    while (true) {
      const [dup] = await db.query('SELECT post_id FROM BLOG_POSTS WHERE slug = ? AND post_id != ?', [
        slug,
        id,
      ]);
      if (!dup.length) break;
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
  }

  const fields = { ...body, slug };
  const allowed = ['title', 'excerpt', 'content', 'image_url', 'author', 'status', 'slug'];
  const sets = [];
  const params = [];
  for (const field of allowed) {
    if (fields[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(fields[field]);
    }
  }
  if (sets.length) {
    params.push(id);
    await db.query(`UPDATE BLOG_POSTS SET ${sets.join(', ')} WHERE post_id = ?`, params);
  }
  return getByIdAdmin(id);
}

async function deletePost(id) {
  const [result] = await db.query('DELETE FROM BLOG_POSTS WHERE post_id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Blog post not found');
}

module.exports = {
  listPublished,
  getBySlug,
  listAllAdmin,
  getByIdAdmin,
  createPost,
  updatePost,
  deletePost,
};
