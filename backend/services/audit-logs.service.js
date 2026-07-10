const db = require('../config/db');

// Records every status change / admin action so it can be reconciled later
// (BR: "All order status changes and refund transactions must be fully recorded").
// Accepts an optional transaction connection so it can participate in the same
// transaction as the state change it is logging.
async function record(conn, { action, entity_type, entity_id, from_status, to_status, actor_user_id }) {
  const runner = conn || db;
  await runner.query(
    `INSERT INTO AUDIT_LOGS (action, entity_type, entity_id, from_status, to_status, actor_user_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [action, entity_type, entity_id, from_status || null, to_status || null, actor_user_id]
  );
}

async function list({ entity_type, entity_id } = {}) {
  const where = [];
  const params = [];
  if (entity_type) {
    where.push('entity_type = ?');
    params.push(entity_type);
  }
  if (entity_id) {
    where.push('entity_id = ?');
    params.push(entity_id);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows] = await db.query(
    `SELECT al.*, u.full_name AS actor_name FROM AUDIT_LOGS al
     LEFT JOIN USERS u ON u.user_id = al.actor_user_id
     ${whereSql} ORDER BY al.created_at DESC LIMIT 500`,
    params
  );
  return rows;
}

module.exports = { record, list };
