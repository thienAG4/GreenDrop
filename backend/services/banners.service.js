const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { toMysqlDatetime } = require('../utils/mysql-datetime');

async function listActiveBanners() {
  const [rows] = await db.query(
    `SELECT * FROM BANNERS WHERE status = 'active' AND NOW() BETWEEN start_at AND end_at
     ORDER BY banner_id DESC`
  );
  return rows;
}

async function listAllBanners() {
  const [rows] = await db.query('SELECT * FROM BANNERS ORDER BY banner_id DESC');
  return rows;
}

function validateInput({ image_url, position, start_at, end_at }) {
  if (!image_url || !position || !start_at || !end_at) {
    throw new HttpError(400, 'Image, position, start and end dates are required');
  }
  if (new Date(end_at) <= new Date(start_at)) {
    throw new HttpError(400, 'End date must be after the start date');
  }
}

async function createBanner(adminUserId, body) {
  validateInput(body);
  const { image_url, position, start_at, end_at, status = 'active' } = body;
  const [result] = await db.query(
    `INSERT INTO BANNERS (created_by_user_id, image_url, position, start_at, end_at, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminUserId, image_url, position, toMysqlDatetime(start_at), toMysqlDatetime(end_at), status]
  );
  const [rows] = await db.query('SELECT * FROM BANNERS WHERE banner_id = ?', [result.insertId]);
  return rows[0];
}

async function updateBanner(id, body) {
  const [existing] = await db.query('SELECT * FROM BANNERS WHERE banner_id = ?', [id]);
  if (!existing.length) throw new HttpError(404, 'Banner not found');
  const merged = { ...existing[0], ...body };
  validateInput(merged);

  const fields = ['image_url', 'position', 'start_at', 'end_at', 'status'];
  const DATETIME_FIELDS = new Set(['start_at', 'end_at']);
  const sets = [];
  const params = [];
  for (const field of fields) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`);
      params.push(DATETIME_FIELDS.has(field) ? toMysqlDatetime(body[field]) : body[field]);
    }
  }
  if (sets.length) {
    params.push(id);
    await db.query(`UPDATE BANNERS SET ${sets.join(', ')} WHERE banner_id = ?`, params);
  }
  const [rows] = await db.query('SELECT * FROM BANNERS WHERE banner_id = ?', [id]);
  return rows[0];
}

async function deleteBanner(id) {
  const [result] = await db.query('DELETE FROM BANNERS WHERE banner_id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Banner not found');
}

module.exports = { listActiveBanners, listAllBanners, createBanner, updateBanner, deleteBanner };
