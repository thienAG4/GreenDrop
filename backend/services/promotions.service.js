const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { toMysqlDatetime } = require('../utils/mysql-datetime');

async function listActiveEvents() {
  await refreshEventStatuses();
  const [rows] = await db.query(
    `SELECT * FROM PROMOTION_EVENTS WHERE status = 'active' AND NOW() BETWEEN start_at AND end_at
     ORDER BY start_at DESC`
  );
  return Promise.all(rows.map(attachProducts));
}

async function attachProducts(event) {
  const [products] = await db.query(
    `SELECT p.product_id, p.name, p.price, p.stock_quantity, p.category_id FROM PROMOTION_EVENT_PRODUCTS pep
     JOIN PRODUCTS p ON p.product_id = pep.product_id WHERE pep.event_id = ?`,
    [event.event_id]
  );
  return { ...event, products };
}

async function listAllEvents() {
  await refreshEventStatuses();
  const [rows] = await db.query('SELECT * FROM PROMOTION_EVENTS ORDER BY event_id DESC');
  return Promise.all(rows.map(attachProducts));
}

function validateInput({ name, discount_percent, start_at, end_at }) {
  if (!name || discount_percent === undefined || !start_at || !end_at) {
    throw new HttpError(400, 'Name, discount percent, start and end dates are required');
  }
  if (new Date(end_at) <= new Date(start_at)) {
    throw new HttpError(400, 'End date must be after the start date');
  }
}

async function createEvent(adminUserId, body) {
  validateInput(body);
  const { name, discount_percent, start_at, end_at, product_ids = [] } = body;
  const status = new Date(start_at) > new Date() ? 'upcoming' : 'active';

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO PROMOTION_EVENTS (name, discount_percent, start_at, end_at, status, created_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, discount_percent, toMysqlDatetime(start_at), toMysqlDatetime(end_at), status, adminUserId]
    );
    const eventId = result.insertId;
    for (const productId of product_ids) {
      await conn.query(
        'INSERT INTO PROMOTION_EVENT_PRODUCTS (product_id, event_id) VALUES (?, ?)',
        [productId, eventId]
      );
    }
    await conn.commit();
    const [rows] = await db.query('SELECT * FROM PROMOTION_EVENTS WHERE event_id = ?', [eventId]);
    return attachProducts(rows[0]);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateEvent(id, body) {
  const [existing] = await db.query('SELECT * FROM PROMOTION_EVENTS WHERE event_id = ?', [id]);
  if (!existing.length) throw new HttpError(404, 'Promotion event not found');

  const merged = { ...existing[0], ...body };
  validateInput(merged);

  const fields = ['name', 'discount_percent', 'start_at', 'end_at', 'status'];
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
    await db.query(`UPDATE PROMOTION_EVENTS SET ${sets.join(', ')} WHERE event_id = ?`, params);
  }

  if (body.product_ids) {
    await db.query('DELETE FROM PROMOTION_EVENT_PRODUCTS WHERE event_id = ?', [id]);
    for (const productId of body.product_ids) {
      await db.query('INSERT INTO PROMOTION_EVENT_PRODUCTS (product_id, event_id) VALUES (?, ?)', [
        productId,
        id,
      ]);
    }
  }

  const [rows] = await db.query('SELECT * FROM PROMOTION_EVENTS WHERE event_id = ?', [id]);
  return attachProducts(rows[0]);
}

async function deleteEvent(id) {
  const [result] = await db.query('DELETE FROM PROMOTION_EVENTS WHERE event_id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Promotion event not found');
}

// A scheduled job (or a call at server boot / periodic cron) would call this to
// flip upcoming->active->ended automatically, matching "After the campaign ends,
// the system automatically updates the status to expired" (section 1.7.1).
async function refreshEventStatuses() {
  await db.query(
    `UPDATE PROMOTION_EVENTS SET status = 'active' WHERE status = 'upcoming' AND NOW() >= start_at AND NOW() <= end_at`
  );
  await db.query(`UPDATE PROMOTION_EVENTS SET status = 'ended' WHERE NOW() > end_at AND status != 'ended'`);
  await db.query(
    `UPDATE VOUCHERS SET status = 'expired' WHERE NOW() > end_at AND status = 'active'`
  );
}

module.exports = {
  listActiveEvents,
  listAllEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  refreshEventStatuses,
};
