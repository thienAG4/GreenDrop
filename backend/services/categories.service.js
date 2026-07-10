const db = require('../config/db');
const HttpError = require('../utils/http-error');

async function listCategories() {
  const [rows] = await db.query(
    `SELECT c.category_id, c.name, COUNT(p.product_id) AS product_count
     FROM CATEGORIES c
     LEFT JOIN PRODUCTS p ON p.category_id = c.category_id AND p.status != 'inactive'
     GROUP BY c.category_id, c.name
     ORDER BY c.name`
  );
  return rows;
}

async function createCategory({ name }) {
  if (!name) throw new HttpError(400, 'Category name is required');
  const [result] = await db.query('INSERT INTO CATEGORIES (name) VALUES (?)', [name]);
  return { category_id: result.insertId, name };
}

async function updateCategory(id, { name }) {
  if (!name) throw new HttpError(400, 'Category name is required');
  const [result] = await db.query('UPDATE CATEGORIES SET name = ? WHERE category_id = ?', [
    name,
    id,
  ]);
  if (!result.affectedRows) throw new HttpError(404, 'Category not found');
  return { category_id: Number(id), name };
}

async function deleteCategory(id) {
  const [result] = await db.query('DELETE FROM CATEGORIES WHERE category_id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Category not found');
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
