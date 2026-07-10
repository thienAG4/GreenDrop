const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { BANNED_WORDS } = require('../utils/constants');

function containsBannedWord(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BANNED_WORDS.some((word) => lower.includes(word));
}

async function recomputeAvgRating(productId) {
  const [[{ avg_rating }]] = await db.query(
    `SELECT COALESCE(AVG(r.rating), 0) AS avg_rating FROM REVIEWS r
     JOIN ORDER_ITEMS oi ON oi.order_item_id = r.order_item_id
     WHERE oi.product_id = ? AND r.is_visible = TRUE`,
    [productId]
  );
  await db.query('UPDATE PRODUCTS SET avg_rating = ? WHERE product_id = ?', [
    Number(avg_rating).toFixed(2),
    productId,
  ]);
}

async function createReview(userId, { order_item_id, rating, content, image_url }) {
  const ratingNum = Number(rating);
  if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
    throw new HttpError(400, 'Rating must be between 1 and 5 stars');
  }

  const [rows] = await db.query(
    `SELECT oi.*, o.status AS order_status, o.user_id FROM ORDER_ITEMS oi
     JOIN ORDERS o ON o.order_id = oi.order_id WHERE oi.order_item_id = ?`,
    [order_item_id]
  );
  if (!rows.length) throw new HttpError(404, 'Order item not found');
  const orderItem = rows[0];

  if (orderItem.user_id !== userId) throw new HttpError(403, 'You can only review your own purchases');
  if (orderItem.order_status !== 'delivered') {
    throw new HttpError(400, 'You can only review products from delivered orders'); // BR
  }
  if (orderItem.is_reviewed) throw new HttpError(409, 'You have already reviewed this order item');

  if (containsBannedWord(content)) {
    // Exception: review contains invalid content -> rejected outright
    throw new HttpError(400, 'Your review could not be published because it contains inappropriate content');
  }

  // Passes the automated pre-check, but still awaits manual admin approval
  // before it becomes visible (section 1.5: "preliminary check... before publishing").
  const [result] = await db.query(
    `INSERT INTO REVIEWS (order_item_id, user_id, rating, content, image_url, is_visible)
     VALUES (?, ?, ?, ?, ?, FALSE)`,
    [order_item_id, userId, ratingNum, content || null, image_url || null]
  );
  await db.query('UPDATE ORDER_ITEMS SET is_reviewed = TRUE WHERE order_item_id = ?', [
    order_item_id,
  ]);

  if (orderItem.product_id) await recomputeAvgRating(orderItem.product_id);

  const [rows2] = await db.query('SELECT * FROM REVIEWS WHERE review_id = ?', [result.insertId]);
  return rows2[0];
}

async function listForProduct(productId) {
  const [rows] = await db.query(
    `SELECT r.*, u.full_name AS reviewer_name FROM REVIEWS r
     JOIN ORDER_ITEMS oi ON oi.order_item_id = r.order_item_id
     JOIN USERS u ON u.user_id = r.user_id
     WHERE oi.product_id = ? AND r.is_visible = TRUE ORDER BY r.created_at DESC`,
    [productId]
  );
  return rows;
}

async function listMine(userId) {
  const [rows] = await db.query(
    `SELECT r.*, oi.product_id, p.name AS product_name FROM REVIEWS r
     JOIN ORDER_ITEMS oi ON oi.order_item_id = r.order_item_id
     LEFT JOIN PRODUCTS p ON p.product_id = oi.product_id
     WHERE r.user_id = ? ORDER BY r.created_at DESC`,
    [userId]
  );
  return rows;
}

async function listAllAdmin({ status, page = 1, limit = 20 } = {}) {
  const where = [];
  if (status === 'pending') where.push('r.is_visible = FALSE');
  if (status === 'visible') where.push('r.is_visible = TRUE');
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageSize = Math.min(Number(limit) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT r.*, u.full_name AS reviewer_name, oi.product_id, p.name AS product_name,
            img.url AS product_thumbnail_url
     FROM REVIEWS r
     JOIN USERS u ON u.user_id = r.user_id
     JOIN ORDER_ITEMS oi ON oi.order_item_id = r.order_item_id
     LEFT JOIN PRODUCTS p ON p.product_id = oi.product_id
     LEFT JOIN IMAGES img ON img.product_id = oi.product_id AND img.is_combo = FALSE AND img.sort_order = 1
     ${whereSql}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [pageSize, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM REVIEWS r ${whereSql}`
  );
  return { items: rows, total, page: Number(page) || 1, limit: pageSize };
}

async function setVisibility(reviewId, isVisible) {
  const [rows] = await db.query('SELECT * FROM REVIEWS WHERE review_id = ?', [reviewId]);
  if (!rows.length) throw new HttpError(404, 'Review not found');
  await db.query('UPDATE REVIEWS SET is_visible = ? WHERE review_id = ?', [!!isVisible, reviewId]);

  const [[orderItem]] = await db.query('SELECT product_id FROM ORDER_ITEMS WHERE order_item_id = ?', [
    rows[0].order_item_id,
  ]);
  if (orderItem && orderItem.product_id) await recomputeAvgRating(orderItem.product_id);
}

module.exports = { createReview, listForProduct, listMine, listAllAdmin, setVisibility };
