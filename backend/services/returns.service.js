const db = require('../config/db');
const HttpError = require('../utils/http-error');
const inventoryService = require('./inventory.service');
const refundsService = require('./refunds.service');
const auditLogsService = require('./audit-logs.service');
const notify = require('../utils/notify');
const {
  RETURN_STATUS,
  RETURN_REASON_DEADLINE,
  DEFAULT_RETURN_DEADLINE_HOURS,
  FLAGGED_ACCOUNT_RETURN_COUNT,
  FLAGGED_ACCOUNT_WINDOW_DAYS,
  ORDER_STATUS,
  ITEM_TYPE,
} = require('../utils/constants');

async function attachItems(returnRequest) {
  const [items] = await db.query(
    `SELECT ri.*, oi.unit_price, oi.item_type, oi.product_id, oi.combo_id,
            COALESCE(p.name, c.name, '(deleted item)') AS item_name,
            COALESCE(ri.evidence_url, pimg.url, cimg.url) AS photo_url
     FROM RETURN_ITEMS ri
     JOIN ORDER_ITEMS oi ON oi.order_item_id = ri.order_item_id
     LEFT JOIN PRODUCTS p ON p.product_id = oi.product_id
     LEFT JOIN COMBOS c ON c.combo_id = oi.combo_id
     LEFT JOIN IMAGES pimg ON pimg.product_id = oi.product_id AND pimg.is_combo = FALSE AND pimg.sort_order = 1
     LEFT JOIN IMAGES cimg ON cimg.combo_id = oi.combo_id AND cimg.is_combo = TRUE AND cimg.sort_order = 1
     WHERE ri.return_id = ?`,
    [returnRequest.return_id]
  );

  // A combo with no persisted preview image of its own (e.g. a design saved
  // before the AI-preview-persistence feature existed) still won't have a
  // photo_url from the join above - fall back one level further to its first
  // component's own product photo, same "always show something real" intent
  // as the evidence/product fallback above.
  for (const item of items) {
    if (!item.photo_url && item.item_type === ITEM_TYPE.COMBO && item.combo_id) {
      const [[component]] = await db.query(
        `SELECT img.url FROM COMBO_ITEMS ci
         JOIN IMAGES img ON img.product_id = ci.product_id AND img.is_combo = FALSE AND img.sort_order = 1
         WHERE ci.combo_id = ? ORDER BY ci.combo_item_id LIMIT 1`,
        [item.combo_id]
      );
      item.photo_url = component ? component.url : null;
    }
  }

  const [refunds] = await db.query('SELECT * FROM REFUNDS WHERE return_id = ?', [
    returnRequest.return_id,
  ]);
  return { ...returnRequest, items, refunds };
}

async function getReturnDetail(returnId) {
  const [rows] = await db.query('SELECT * FROM RETURN_REQUESTS WHERE return_id = ?', [returnId]);
  if (!rows.length) throw new HttpError(404, 'Return request not found');
  return attachItems(rows[0]);
}

async function listMyReturns(userId) {
  const [rows] = await db.query(
    'SELECT * FROM RETURN_REQUESTS WHERE customer_user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return Promise.all(rows.map(attachItems));
}

async function listAllReturns({ status } = {}) {
  const where = status ? 'WHERE rr.status = ?' : '';
  const params = status ? [status] : [];
  const [rows] = await db.query(
    `SELECT rr.*, u.full_name AS customer_name, u.is_flagged AS customer_flagged
     FROM RETURN_REQUESTS rr JOIN USERS u ON u.user_id = rr.customer_user_id
     ${where} ORDER BY rr.created_at DESC`,
    params
  );
  return Promise.all(rows.map(attachItems));
}

async function refreshFlaggedStatus(userId) {
  const [[{ recent_count }]] = await db.query(
    `SELECT COUNT(*) AS recent_count FROM RETURN_REQUESTS
     WHERE customer_user_id = ? AND created_at >= NOW() - INTERVAL ? DAY`,
    [userId, FLAGGED_ACCOUNT_WINDOW_DAYS]
  );
  const isFlagged = recent_count > FLAGGED_ACCOUNT_RETURN_COUNT;
  await db.query('UPDATE USERS SET is_flagged = ? WHERE user_id = ?', [isFlagged, userId]);
  return isFlagged;
}

async function createReturnRequest(userId, { order_item_id, reason_type, description, quantity, evidence_urls }) {
  if (!evidence_urls || !evidence_urls.length) {
    throw new HttpError(400, 'At least one evidence image is required'); // BR-03
  }
  if (!reason_type) throw new HttpError(400, 'A return reason is required');

  const [rows] = await db.query(
    `SELECT oi.*, o.status AS order_status, o.delivered_at, o.user_id
     FROM ORDER_ITEMS oi JOIN ORDERS o ON o.order_id = oi.order_id
     WHERE oi.order_item_id = ?`,
    [order_item_id]
  );
  if (!rows.length) throw new HttpError(404, 'Order item not found');
  const orderItem = rows[0];

  if (orderItem.user_id !== userId) throw new HttpError(403, 'This order item does not belong to you');
  if (orderItem.order_status !== ORDER_STATUS.DELIVERED || !orderItem.delivered_at) {
    throw new HttpError(400, 'Only items from delivered orders can be returned'); // BR-02
  }
  if (orderItem.is_returned) throw new HttpError(400, 'This item has already been returned');

  // A rejected request shouldn't permanently block a customer from trying again
  // (design: "add more evidence" / resubmit after rejection), so only an
  // in-flight (not-yet-rejected) request blocks a new one.
  const [activeReturns] = await db.query(
    `SELECT ri.return_item_id FROM RETURN_ITEMS ri
     JOIN RETURN_REQUESTS rr ON rr.return_id = ri.return_id
     WHERE ri.order_item_id = ? AND rr.status != 'rejected'
     LIMIT 1`,
    [order_item_id]
  );
  if (activeReturns.length) {
    throw new HttpError(409, 'A return request is already in progress for this item');
  }

  const deadlineHours = (RETURN_REASON_DEADLINE[reason_type] || { hours: DEFAULT_RETURN_DEADLINE_HOURS }).hours;
  const deadlineMs = new Date(orderItem.delivered_at).getTime() + deadlineHours * 60 * 60 * 1000;
  if (Date.now() > deadlineMs) {
    throw new HttpError(400, `The return window for this reason (${deadlineHours}h after delivery) has passed`);
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO RETURN_REQUESTS (reason_type, description, status, customer_user_id)
       VALUES (?, ?, ?, ?)`,
      [reason_type, description || null, RETURN_STATUS.REQUESTED, userId]
    );
    const returnId = result.insertId;
    for (const url of evidence_urls) {
      await conn.query(
        'INSERT INTO RETURN_ITEMS (quantity, evidence_url, return_id, order_item_id) VALUES (?, ?, ?, ?)',
        [quantity || orderItem.quantity, url, returnId, order_item_id]
      );
    }
    await auditLogsService.record(conn, {
      action: 'return_requested',
      entity_type: 'return_request',
      entity_id: returnId,
      from_status: null,
      to_status: RETURN_STATUS.REQUESTED,
      actor_user_id: userId,
    });
    await conn.commit();

    await refreshFlaggedStatus(userId); // BR: FLAGGED_ACCOUNT after >3 requests in 180 days
    return getReturnDetail(returnId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function approveReturn(returnId, adminUserId) {
  const [rows] = await db.query('SELECT * FROM RETURN_REQUESTS WHERE return_id = ?', [returnId]);
  if (!rows.length) throw new HttpError(404, 'Return request not found');
  if (rows[0].status !== RETURN_STATUS.REQUESTED) {
    throw new HttpError(400, 'Only pending return requests can be approved');
  }

  await db.query('UPDATE RETURN_REQUESTS SET status = ?, handled_by_user_id = ? WHERE return_id = ?', [
    RETURN_STATUS.APPROVED,
    adminUserId,
    returnId,
  ]);
  await auditLogsService.record(null, {
    action: 'return_approved',
    entity_type: 'return_request',
    entity_id: returnId,
    from_status: RETURN_STATUS.REQUESTED,
    to_status: RETURN_STATUS.APPROVED,
    actor_user_id: adminUserId,
  });

  const [[customer]] = await db.query('SELECT email FROM USERS WHERE user_id = ?', [
    rows[0].customer_user_id,
  ]);
  await notify.sendEmail(
    customer.email,
    `Return request #${returnId} approved`,
    'Please package the item(s) and ship them to our returns warehouse. You will be refunded once we verify the condition of the item(s).'
  );

  return getReturnDetail(returnId);
}

async function rejectReturn(returnId, adminUserId, rejectReason) {
  if (!rejectReason) throw new HttpError(400, 'A rejection reason is required');
  const [rows] = await db.query('SELECT * FROM RETURN_REQUESTS WHERE return_id = ?', [returnId]);
  if (!rows.length) throw new HttpError(404, 'Return request not found');
  if ([RETURN_STATUS.REJECTED, RETURN_STATUS.ITEM_RECEIVED].includes(rows[0].status)) {
    throw new HttpError(400, 'This return request has already been finalized');
  }

  await db.query(
    'UPDATE RETURN_REQUESTS SET status = ?, reject_reason = ?, handled_by_user_id = ? WHERE return_id = ?',
    [RETURN_STATUS.REJECTED, rejectReason, adminUserId, returnId]
  );
  await auditLogsService.record(null, {
    action: 'return_rejected',
    entity_type: 'return_request',
    entity_id: returnId,
    from_status: rows[0].status,
    to_status: RETURN_STATUS.REJECTED,
    actor_user_id: adminUserId,
  });

  const [[customer]] = await db.query('SELECT email FROM USERS WHERE user_id = ?', [
    rows[0].customer_user_id,
  ]);
  await notify.sendEmail(customer.email, `Return request #${returnId} rejected`, `Reason: ${rejectReason}`);

  return getReturnDetail(returnId);
}

// Admin confirms the physical goods arrived and passed inspection -> restores
// stock (if resellable) and kicks off the refund. If the goods don't match the
// original request, use rejectReturn instead (Exception 4).
async function markItemReceived(returnId, adminUserId, { restock = true } = {}) {
  const returnRequest = await getReturnDetail(returnId);
  if (returnRequest.status !== RETURN_STATUS.APPROVED) {
    throw new HttpError(400, 'Only approved return requests can be marked as received');
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let refundAmount = 0;
    for (const item of returnRequest.items) {
      refundAmount += Number(item.unit_price) * item.quantity;
      if (restock) {
        if (item.item_type === ITEM_TYPE.PRODUCT && item.product_id) {
          await inventoryService.restoreProductStock(conn, item.product_id, item.quantity);
        } else if (item.item_type === ITEM_TYPE.COMBO && item.combo_id) {
          await inventoryService.restoreComboStock(conn, item.combo_id, item.quantity);
        }
      }
      // The item is only considered "returned" once physically received and
      // accepted - not merely requested (see createReturnRequest).
      await conn.query('UPDATE ORDER_ITEMS SET is_returned = TRUE WHERE order_item_id = ?', [
        item.order_item_id,
      ]);
    }

    await conn.query('UPDATE RETURN_REQUESTS SET status = ? WHERE return_id = ?', [
      RETURN_STATUS.ITEM_RECEIVED,
      returnId,
    ]);
    await auditLogsService.record(conn, {
      action: 'return_item_received',
      entity_type: 'return_request',
      entity_id: returnId,
      from_status: RETURN_STATUS.APPROVED,
      to_status: RETURN_STATUS.ITEM_RECEIVED,
      actor_user_id: adminUserId,
    });

    const refund = await refundsService.createAndProcessRefund(conn, {
      returnId,
      amount: refundAmount,
    });

    await conn.commit();

    const [[customer]] = await db.query('SELECT email FROM USERS WHERE user_id = ?', [
      returnRequest.customer_user_id,
    ]);
    const message =
      refund.status === 'completed'
        ? `Your refund of ${refundAmount} has been processed.`
        : 'We received your item, but the refund could not be processed automatically. Our team will follow up shortly.';
    await notify.sendEmail(customer.email, `Return #${returnId} update`, message);

    return getReturnDetail(returnId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

// Customer submits the carrier tracking code after shipping the goods back,
// once the request has been approved (design spec: "Address Return" step).
async function submitTracking(userId, returnId, trackingNumber) {
  if (!trackingNumber) throw new HttpError(400, 'A tracking number is required');
  const [rows] = await db.query('SELECT * FROM RETURN_REQUESTS WHERE return_id = ?', [returnId]);
  if (!rows.length) throw new HttpError(404, 'Return request not found');
  if (rows[0].customer_user_id !== userId) throw new HttpError(403, 'This is not your return request');
  if (rows[0].status !== RETURN_STATUS.APPROVED) {
    throw new HttpError(400, 'You can only submit tracking info for an approved return request');
  }
  await db.query('UPDATE RETURN_REQUESTS SET tracking_number = ? WHERE return_id = ?', [
    trackingNumber,
    returnId,
  ]);
  return getReturnDetail(returnId);
}

module.exports = {
  listMyReturns,
  listAllReturns,
  getReturnDetail,
  createReturnRequest,
  approveReturn,
  rejectReturn,
  markItemReceived,
  submitTracking,
};
