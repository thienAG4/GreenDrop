const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { PUBLIC_USER_FIELDS } = require('./auth.service');

async function updateProfile(userId, { full_name, phone, gender }) {
  await db.query(
    'UPDATE USERS SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone), gender = COALESCE(?, gender) WHERE user_id = ?',
    [full_name || null, phone || null, gender || null, userId]
  );
  const [rows] = await db.query(`SELECT ${PUBLIC_USER_FIELDS} FROM USERS WHERE user_id = ?`, [
    userId,
  ]);
  return rows[0];
}

async function listAddresses(userId) {
  const [rows] = await db.query(
    'SELECT * FROM ADDRESS WHERE user_id = ? ORDER BY is_default DESC, address_id DESC',
    [userId]
  );
  return rows;
}

async function addAddress(userId, { address_line, city, district, is_default }) {
  if (!address_line) throw new HttpError(400, 'Address line is required');

  if (is_default) {
    await db.query('UPDATE ADDRESS SET is_default = FALSE WHERE user_id = ?', [userId]);
  }
  const [result] = await db.query(
    'INSERT INTO ADDRESS (user_id, address_line, city, district, is_default) VALUES (?, ?, ?, ?, ?)',
    [userId, address_line, city || null, district || null, !!is_default]
  );
  const [rows] = await db.query('SELECT * FROM ADDRESS WHERE address_id = ?', [result.insertId]);
  return rows[0];
}

async function updateAddress(userId, addressId, { address_line, city, district, is_default }) {
  const [existing] = await db.query(
    'SELECT * FROM ADDRESS WHERE address_id = ? AND user_id = ?',
    [addressId, userId]
  );
  if (!existing.length) throw new HttpError(404, 'Address not found');

  if (is_default) {
    await db.query('UPDATE ADDRESS SET is_default = FALSE WHERE user_id = ?', [userId]);
  }
  await db.query(
    `UPDATE ADDRESS SET address_line = COALESCE(?, address_line), city = COALESCE(?, city),
     district = COALESCE(?, district), is_default = COALESCE(?, is_default)
     WHERE address_id = ? AND user_id = ?`,
    [address_line || null, city || null, district || null, is_default, addressId, userId]
  );
  const [rows] = await db.query('SELECT * FROM ADDRESS WHERE address_id = ?', [addressId]);
  return rows[0];
}

async function deleteAddress(userId, addressId) {
  const [result] = await db.query('DELETE FROM ADDRESS WHERE address_id = ? AND user_id = ?', [
    addressId,
    userId,
  ]);
  if (!result.affectedRows) throw new HttpError(404, 'Address not found');
}

async function listUsers({ role, page = 1, limit = 20 } = {}) {
  const params = [];
  let whereSql = '';
  if (role) {
    whereSql = ' WHERE role = ?';
    params.push(role);
  }
  const pageSize = Math.min(Number(limit) || 20, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT ${PUBLIC_USER_FIELDS} FROM USERS${whereSql} ORDER BY user_id DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM USERS${whereSql}`, params);
  return { items: rows, total, page: Number(page) || 1, limit: pageSize };
}

// Admin "customer detail" view: real, derivable metrics only (order count,
// total spent, average rating from their own reviews, last few orders) - no
// loyalty tier / reward points / notes, since none of that has a backing
// column anywhere in the schema.
async function getUserDetailAdmin(userId) {
  const [rows] = await db.query(`SELECT ${PUBLIC_USER_FIELDS} FROM USERS WHERE user_id = ?`, [
    userId,
  ]);
  if (!rows.length) throw new HttpError(404, 'User not found');
  const user = rows[0];

  const [[orderStats]] = await db.query(
    'SELECT COUNT(*) AS order_count, COALESCE(SUM(total_amount), 0) AS total_spent FROM ORDERS WHERE user_id = ?',
    [userId]
  );
  const [[reviewStats]] = await db.query(
    'SELECT AVG(rating) AS avg_rating FROM REVIEWS WHERE user_id = ?',
    [userId]
  );
  const [recentOrders] = await db.query(
    'SELECT order_id, order_date, status, total_amount FROM ORDERS WHERE user_id = ? ORDER BY order_date DESC LIMIT 5',
    [userId]
  );

  return {
    ...user,
    order_count: orderStats.order_count,
    total_spent: orderStats.total_spent,
    avg_rating: reviewStats.avg_rating ? Number(reviewStats.avg_rating) : null,
    recent_orders: recentOrders,
  };
}

async function setUserStatus(userId, status) {
  if (!['active', 'inactive', 'banned'].includes(status)) {
    throw new HttpError(400, 'Invalid status value');
  }
  const [result] = await db.query('UPDATE USERS SET status = ? WHERE user_id = ?', [
    status,
    userId,
  ]);
  if (!result.affectedRows) throw new HttpError(404, 'User not found');
}

module.exports = {
  updateProfile,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  listUsers,
  getUserDetailAdmin,
  setUserStatus,
};
