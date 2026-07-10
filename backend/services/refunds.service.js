const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { REFUND_STATUS } = require('../utils/constants');

// Simulated payment-gateway refund call. `forceOutcome` lets callers (tests, or a
// "simulate success/fail" button in the admin UI) drive the result deterministically;
// otherwise it is weighted to mostly succeed, like a real gateway would.
function callGatewayRefund(forceOutcome) {
  const outcome = forceOutcome || (Math.random() < 0.85 ? 'success' : 'fail');
  return outcome === 'success'
    ? { success: true, gateway_ref_id: `GW-REF-${Date.now()}-${Math.floor(Math.random() * 1000)}` }
    : { success: false };
}

// Creates a REFUNDS row tied to a RETURN_REQUESTS row (the schema requires this
// link even for a plain order-cancellation refund - see orders.service.js) and
// immediately drives it through the simulated gateway.
async function createAndProcessRefund(conn, { returnId, amount, forceOutcome }) {
  const [result] = await conn.query(
    `INSERT INTO REFUNDS (amount, status, return_id) VALUES (?, ?, ?)`,
    [amount, REFUND_STATUS.PROCESSING, returnId]
  );
  const refundId = result.insertId;
  const outcome = callGatewayRefund(forceOutcome);

  if (outcome.success) {
    await conn.query('UPDATE REFUNDS SET status = ?, gateway_ref_id = ? WHERE refund_id = ?', [
      REFUND_STATUS.COMPLETED,
      outcome.gateway_ref_id,
      refundId,
    ]);
  } else {
    await conn.query('UPDATE REFUNDS SET status = ? WHERE refund_id = ?', [
      REFUND_STATUS.FAILED,
      refundId,
    ]);
  }

  const [rows] = await conn.query('SELECT * FROM REFUNDS WHERE refund_id = ?', [refundId]);
  return rows[0];
}

// Admin manual retry after a REFUND_FAILED outcome (BR: transitions to manual processing).
async function retryRefund(refundId, forceOutcome) {
  const [rows] = await db.query('SELECT * FROM REFUNDS WHERE refund_id = ?', [refundId]);
  if (!rows.length) throw new HttpError(404, 'Refund not found');
  if (rows[0].status === REFUND_STATUS.COMPLETED) {
    throw new HttpError(400, 'This refund has already been completed');
  }

  const outcome = callGatewayRefund(forceOutcome);
  if (outcome.success) {
    await db.query('UPDATE REFUNDS SET status = ?, gateway_ref_id = ? WHERE refund_id = ?', [
      REFUND_STATUS.COMPLETED,
      outcome.gateway_ref_id,
      refundId,
    ]);
  } else {
    await db.query('UPDATE REFUNDS SET status = ? WHERE refund_id = ?', [
      REFUND_STATUS.FAILED,
      refundId,
    ]);
  }
  const [updated] = await db.query('SELECT * FROM REFUNDS WHERE refund_id = ?', [refundId]);
  return updated[0];
}

async function listRefunds({ status } = {}) {
  const where = status ? 'WHERE r.status = ?' : '';
  const params = status ? [status] : [];
  const [rows] = await db.query(
    `SELECT r.*, rr.reason_type, rr.customer_user_id, u.full_name AS customer_name
     FROM REFUNDS r
     JOIN RETURN_REQUESTS rr ON rr.return_id = r.return_id
     JOIN USERS u ON u.user_id = rr.customer_user_id
     ${where} ORDER BY r.refund_id DESC`,
    params
  );
  return rows;
}

module.exports = { createAndProcessRefund, retryRefund, listRefunds };
