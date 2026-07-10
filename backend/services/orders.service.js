const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const HttpError = require('../utils/http-error');
const cartService = require('./cart.service');
const vouchersService = require('./vouchers.service');
const inventoryService = require('./inventory.service');
const auditLogsService = require('./audit-logs.service');
const refundsService = require('./refunds.service');
const notify = require('../utils/notify');
const {
  ORDER_STATUS,
  CANCELLABLE_ORDER_STATUS,
  PAYMENT_STATUS,
  PAYMENT_METHOD,
  ONLINE_PAYMENT_METHODS,
  RETURN_STATUS,
  ITEM_TYPE,
  QR_EXPIRY_MINUTES,
  SHIPPING_FEE,
  USER_ROLE,
} = require('../utils/constants');

function formatAddress({ address_line, city, district }) {
  return [address_line, district, city].filter(Boolean).join(', ');
}

// Schema note: ORDERS.user_id is NOT NULL, so a truly account-less guest still
// needs a USERS row to satisfy the FK. We create one transparently (no password
// the guest ever sees) so "guest checkout" stays true from the customer's point
// of view, while phone-based order tracking (BR) works off a real column.
async function findOrCreateGuestUser({ full_name, phone, email }) {
  const effectiveEmail = email || `guest-${phone}-${Date.now()}@greendrop.local`;
  const [existing] = await db.query('SELECT user_id FROM USERS WHERE email = ?', [effectiveEmail]);
  if (existing.length) return existing[0].user_id;

  const randomPassword = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
  const [result] = await db.query(
    `INSERT INTO USERS (full_name, email, phone, role, status, password) VALUES (?, ?, ?, ?, 'active', ?)`,
    [full_name, effectiveEmail, phone, USER_ROLE.CUSTOMER, randomPassword]
  );
  return result.insertId;
}

async function getOrderDetail(orderId) {
  const [rows] = await db.query(
    `SELECT o.*, u.full_name AS customer_name, u.phone AS customer_phone, u.email AS customer_email
     FROM ORDERS o JOIN USERS u ON u.user_id = o.user_id WHERE o.order_id = ?`,
    [orderId]
  );
  if (!rows.length) throw new HttpError(404, 'Order not found');
  let order = rows[0];

  order = await autoExpireIfNeeded(order);

  const [items] = await db.query('SELECT * FROM ORDER_ITEMS WHERE order_id = ?', [orderId]);
  for (const item of items) {
    if (item.item_type === ITEM_TYPE.COMBO) {
      const [components] = await db.query(
        `SELECT oic.*, p.name FROM ORDER_ITEM_COMPONENTS oic JOIN PRODUCTS p ON p.product_id = oic.product_id
         WHERE oic.order_item_id = ?`,
        [item.order_item_id]
      );
      item.components = components;
      const [[comboImage]] = await db.query(
        `SELECT url FROM IMAGES WHERE is_combo = TRUE AND combo_id = ? AND sort_order = 1 LIMIT 1`,
        [item.combo_id]
      );
      item.thumbnail_url = comboImage ? comboImage.url : null;
    } else {
      const [[product]] = await db.query('SELECT name FROM PRODUCTS WHERE product_id = ?', [
        item.product_id,
      ]);
      item.name = product ? product.name : '(deleted product)';
      const [[productImage]] = await db.query(
        `SELECT url FROM IMAGES WHERE is_combo = FALSE AND product_id = ? AND sort_order = 1 LIMIT 1`,
        [item.product_id]
      );
      item.thumbnail_url = productImage ? productImage.url : null;
    }
  }

  return { ...order, items };
}

async function autoExpireIfNeeded(order) {
  const isStalePendingPayment =
    order.status === ORDER_STATUS.PENDING &&
    order.payment_status === PAYMENT_STATUS.UNPAID &&
    ONLINE_PAYMENT_METHODS.includes(order.payment_method) &&
    Date.now() - new Date(order.created_at).getTime() > QR_EXPIRY_MINUTES * 60 * 1000;

  if (!isStalePendingPayment) return order;
  await cancelOrderCore(order.order_id, 'Payment window expired (15 minutes)', null);
  const [rows] = await db.query('SELECT * FROM ORDERS WHERE order_id = ?', [order.order_id]);
  return { ...order, ...rows[0] };
}

async function listOrdersForUser(userId) {
  const [rows] = await db.query('SELECT * FROM ORDERS WHERE user_id = ? ORDER BY order_date DESC', [
    userId,
  ]);
  return Promise.all(rows.map((r) => getOrderDetail(r.order_id)));
}

// Batches one thumbnail per order item (product's sort_order=1 image, or the
// combo's) so the admin order list/detail can show product photos without
// an N+1 query per order.
async function attachOrderItemThumbnails(orders) {
  if (!orders.length) return orders;
  const orderIds = orders.map((o) => o.order_id);
  const [items] = await db.query(
    `SELECT oi.order_item_id, oi.order_id, oi.item_type, oi.product_id, oi.combo_id,
            oi.quantity, oi.unit_price, COALESCE(p.name, c.name) AS name, img.url AS thumbnail_url
     FROM ORDER_ITEMS oi
     LEFT JOIN PRODUCTS p ON p.product_id = oi.product_id
     LEFT JOIN COMBOS c ON c.combo_id = oi.combo_id
     LEFT JOIN IMAGES img ON (
       (oi.item_type = 'product' AND img.product_id = oi.product_id AND img.is_combo = FALSE AND img.sort_order = 1)
       OR (oi.item_type = 'combo' AND img.combo_id = oi.combo_id AND img.is_combo = TRUE AND img.sort_order = 1)
     )
     WHERE oi.order_id IN (?)`,
    [orderIds]
  );
  const byOrder = items.reduce((acc, row) => {
    (acc[row.order_id] = acc[row.order_id] || []).push(row);
    return acc;
  }, {});
  return orders.map((o) => ({ ...o, items: byOrder[o.order_id] || [] }));
}

async function listOrdersAdmin({ status, payment_status, page = 1, limit = 10 } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('o.status = ?');
    params.push(status);
  }
  if (payment_status) {
    where.push('o.payment_status = ?');
    params.push(payment_status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const pageSize = Math.min(Number(limit) || 10, 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * pageSize;

  const [rows] = await db.query(
    `SELECT o.*, u.full_name AS customer_name, u.phone AS customer_phone FROM ORDERS o
     JOIN USERS u ON u.user_id = o.user_id ${whereSql} ORDER BY o.order_date DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM ORDERS o ${whereSql}`,
    params
  );

  const items = await attachOrderItemThumbnails(rows);
  return { items, total, page: Number(page) || 1, limit: pageSize };
}

// Powers the admin order-management KPI cards: total + a count per status,
// independent of whatever status filter/page is currently applied to the list.
async function getOrderStatusCounts() {
  const [rows] = await db.query('SELECT status, COUNT(*) AS count FROM ORDERS GROUP BY status');
  const counts = {
    pending: 0,
    confirmed: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
    returned: 0,
  };
  let total = 0;
  for (const row of rows) {
    counts[row.status] = Number(row.count);
    total += Number(row.count);
  }
  return { total, ...counts };
}

async function trackOrder(orderId, phone) {
  const [rows] = await db.query(
    `SELECT o.order_id FROM ORDERS o JOIN USERS u ON u.user_id = o.user_id
     WHERE o.order_id = ? AND u.phone = ?`,
    [orderId, phone]
  );
  if (!rows.length) throw new HttpError(404, 'No order found matching that order code and phone number');
  return getOrderDetail(orderId);
}

async function checkout(identity, payload) {
  const { address_id, new_address, payment_method, voucher_code, guest_full_name, guest_phone, guest_email } =
    payload;

  if (!Object.values(PAYMENT_METHOD).includes(payment_method)) {
    throw new HttpError(400, 'Invalid payment method');
  }

  let userId = identity.userId;
  const isGuestCheckout = !userId;
  if (isGuestCheckout) {
    if (!guest_full_name || !guest_phone) {
      throw new HttpError(400, 'Full name and phone number are required to check out as a guest');
    }
    userId = await findOrCreateGuestUser({ full_name: guest_full_name, phone: guest_phone, email: guest_email });
  }

  const cart = await cartService.getOrCreateCart(
    identity.userId ? { userId: identity.userId } : { sessionToken: identity.sessionToken }
  );
  const view = await cartService.getCartView(cart);
  if (!view.items.length) throw new HttpError(400, 'Your cart is empty'); // BR: order must contain at least one product
  if (view.items.some((i) => !i.available)) {
    // Exception: Product out of stock at checkout
    throw new HttpError(409, 'Some items in your cart are no longer available. Please update your cart.');
  }

  let shippingAddress;
  if (address_id) {
    const [rows] = await db.query('SELECT * FROM ADDRESS WHERE address_id = ? AND user_id = ?', [
      address_id,
      userId,
    ]);
    if (!rows.length) throw new HttpError(404, 'Address not found');
    shippingAddress = formatAddress(rows[0]);
  } else if (new_address && new_address.address_line) {
    shippingAddress = formatAddress(new_address);
    if (new_address.save_for_later && !isGuestCheckout) {
      await db.query(
        'INSERT INTO ADDRESS (user_id, address_line, city, district, is_default) VALUES (?, ?, ?, ?, FALSE)',
        [userId, new_address.address_line, new_address.city || null, new_address.district || null]
      );
    }
  } else {
    throw new HttpError(400, 'Shipping address is required');
  }

  const subtotal = view.subtotal;
  let orderId;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let discountAmount = 0;
    let voucherId = null;
    if (voucher_code) {
      const { voucher, discount_amount } = await vouchersService.applyVoucher(conn, voucher_code, subtotal);
      discountAmount = discount_amount;
      voucherId = voucher.voucher_id;
    }
    const totalAmount = subtotal - discountAmount + SHIPPING_FEE;

    const [orderResult] = await conn.query(
      `INSERT INTO ORDERS (status, subtotal, discount_amount, total_amount, shipping_address, shipping_fee, payment_method, voucher_id, user_id, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ORDER_STATUS.PENDING,
        subtotal,
        discountAmount,
        totalAmount,
        shippingAddress,
        SHIPPING_FEE,
        payment_method,
        voucherId,
        userId,
        PAYMENT_STATUS.UNPAID,
      ]
    );
    orderId = orderResult.insertId;

    for (const line of view.items) {
      if (line.item_type === ITEM_TYPE.PRODUCT) {
        await inventoryService.decrementProductStock(conn, line.product_id, line.quantity);
      } else {
        await inventoryService.decrementComboStock(conn, line.combo_id, line.quantity);
      }

      const [oiResult] = await conn.query(
        `INSERT INTO ORDER_ITEMS (quantity, combo_id, order_id, product_id, unit_price, item_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          line.quantity,
          line.item_type === ITEM_TYPE.COMBO ? line.combo_id : null,
          orderId,
          line.item_type === ITEM_TYPE.PRODUCT ? line.product_id : null,
          line.unit_price,
          line.item_type,
        ]
      );

      if (line.item_type === ITEM_TYPE.COMBO) {
        const [components] = await conn.query('SELECT * FROM COMBO_ITEMS WHERE combo_id = ?', [
          line.combo_id,
        ]);
        for (const comp of components) {
          const [[product]] = await conn.query('SELECT price FROM PRODUCTS WHERE product_id = ?', [
            comp.product_id,
          ]);
          const componentQuantity = comp.quantity * line.quantity;
          await conn.query(
            `INSERT INTO ORDER_ITEM_COMPONENTS (order_item_id, product_id, quantity, allocatetd_price)
             VALUES (?, ?, ?, ?)`,
            [oiResult.insertId, comp.product_id, componentQuantity, product.price * componentQuantity]
          );
        }
      }
    }

    await auditLogsService.record(conn, {
      action: 'order_created',
      entity_type: 'order',
      entity_id: orderId,
      from_status: null,
      to_status: ORDER_STATUS.PENDING,
      actor_user_id: userId,
    });

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  await cartService.clearCart(cart.cart_id);

  let paymentPayload = null;
  if (ONLINE_PAYMENT_METHODS.includes(payment_method)) {
    const txnId = `TXN-SIM-${orderId}-${Date.now()}`;
    await db.query('UPDATE ORDERS SET payment_txn_id = ? WHERE order_id = ?', [txnId, orderId]);
    const uploadsBase = process.env.PUBLIC_UPLOADS_URL || '/uploads';
    paymentPayload = {
      qr_image_url: `${uploadsBase}/images/QR_code.jpg`,
      payment_txn_id: txnId,
      expires_at: new Date(Date.now() + QR_EXPIRY_MINUTES * 60 * 1000).toISOString(),
    };
  }

  const order = await getOrderDetail(orderId);
  await notify.sendEmail(order.customer_email, `Order #${orderId} confirmed`, 'Thank you for your order! We are preparing it now.');
  await notify.sendSms(order.customer_phone, `GreenDrop: your order #${orderId} was placed successfully.`);

  return { order, payment: paymentPayload };
}

async function confirmPayment(orderId, outcome) {
  const order = await getOrderDetail(orderId);
  if (!ONLINE_PAYMENT_METHODS.includes(order.payment_method)) {
    throw new HttpError(400, 'This order does not use an online payment method');
  }
  // Idempotent: a result was already recorded for this order (e.g. the "simulate"
  // button fired twice, or the QR-expiry auto-cancel raced with a manual confirm).
  // Return the existing outcome instead of erroring so the UI doesn't get stuck.
  if (order.payment_status === PAYMENT_STATUS.PAID || order.status === ORDER_STATUS.CANCELLED) {
    return order;
  }
  if (order.payment_status !== PAYMENT_STATUS.UNPAID || order.status !== ORDER_STATUS.PENDING) {
    throw new HttpError(400, 'This order is not awaiting payment');
  }

  if (outcome === 'success') {
    await db.query('UPDATE ORDERS SET payment_status = ? WHERE order_id = ?', [
      PAYMENT_STATUS.PAID,
      orderId,
    ]);
    await auditLogsService.record(null, {
      action: 'payment_success',
      entity_type: 'order',
      entity_id: orderId,
      from_status: PAYMENT_STATUS.UNPAID,
      to_status: PAYMENT_STATUS.PAID,
      actor_user_id: order.user_id,
    });
    await notify.sendEmail(order.customer_email, `Payment received for order #${orderId}`, 'Your payment was successful.');
    return getOrderDetail(orderId);
  }

  // Payment gateway declined the transaction (Exception in section 1.1.3)
  await cancelOrderCore(orderId, 'Payment gateway declined the transaction', null);
  return getOrderDetail(orderId);
}

// Shared state-mutation core for every cancellation path (customer self-service,
// admin override, and automatic QR-expiry). Callers are responsible for
// authorization / status-eligibility checks before calling this.
// COD orders have no card/wallet on file to refund to automatically (nothing
// was collected before delivery), so a customer cancelling one supplies where
// to send a refund if one turns out to be due. There's no schema column for
// this (schema is fixed) - folded into RETURN_REQUESTS.description alongside
// the cancel reason, the same free-text-column workaround already used for
// cancel_reason elsewhere in this file.
function formatBankInfoSummary(bankInfo) {
  if (!bankInfo) return null;
  if (bankInfo.method === 'bank') return `Chuyển khoản ngân hàng: ${bankInfo.bank_name} - STK ${bankInfo.account_number}`;
  if (bankInfo.method === 'card') return `Thẻ Visa/Mastercard: ${bankInfo.card_number}`;
  if (bankInfo.method === 'momo') return `Ví Momo: ${bankInfo.momo_number}`;
  return null;
}

async function cancelOrderCore(orderId, reason, actorUserId, bankInfo) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query('SELECT * FROM ORDERS WHERE order_id = ? FOR UPDATE', [
      orderId,
    ]);
    if (!rows.length) throw new HttpError(404, 'Order not found');
    const order = rows[0];
    if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.DELIVERED].includes(order.status)) {
      throw new HttpError(400, 'This order can no longer be cancelled');
    }

    const [items] = await conn.query('SELECT * FROM ORDER_ITEMS WHERE order_id = ?', [orderId]);
    for (const item of items) {
      if (item.item_type === ITEM_TYPE.PRODUCT && item.product_id) {
        await inventoryService.restoreProductStock(conn, item.product_id, item.quantity);
      } else if (item.item_type === ITEM_TYPE.COMBO && item.combo_id) {
        await inventoryService.restoreComboStock(conn, item.combo_id, item.quantity);
      }
    }

    await conn.query('UPDATE ORDERS SET status = ?, cancel_reason = ? WHERE order_id = ?', [
      ORDER_STATUS.CANCELLED,
      reason,
      orderId,
    ]);
    await auditLogsService.record(conn, {
      action: 'order_cancelled',
      entity_type: 'order',
      entity_id: orderId,
      from_status: order.status,
      to_status: ORDER_STATUS.CANCELLED,
      actor_user_id: actorUserId || order.user_id,
    });

    let refund = null;
    // BR-06/07/08: online payment methods automatically trigger a refund back
    // to the original payment method. COD orders have nothing on file to
    // refund to, so a refund is only attempted there when the customer has
    // supplied where to send it (bankInfo - customer-initiated cancellation
    // only, see customerCancelOrder; admin-initiated COD cancellations still
    // skip this, matching the original behavior).
    const needsRefund =
      (order.payment_method !== PAYMENT_METHOD.COD && order.payment_status === PAYMENT_STATUS.PAID) ||
      (order.payment_method === PAYMENT_METHOD.COD && bankInfo);
    if (needsRefund) {
      const bankSummary = formatBankInfoSummary(bankInfo);
      const description = bankSummary ? `${reason}\n\nThông tin nhận hoàn tiền: ${bankSummary}` : reason;
      // REFUNDS requires a RETURN_REQUESTS row (schema FK), so we record a
      // system-generated "return" representing the cancellation refund.
      const [returnResult] = await conn.query(
        `INSERT INTO RETURN_REQUESTS (reason_type, description, status, customer_user_id, handled_by_user_id)
         VALUES ('order_cancelled', ?, ?, ?, NULL)`,
        [description, RETURN_STATUS.ITEM_RECEIVED, order.user_id]
      );
      const returnId = returnResult.insertId;
      for (const item of items) {
        await conn.query(
          'INSERT INTO RETURN_ITEMS (quantity, evidence_url, return_id, order_item_id) VALUES (?, NULL, ?, ?)',
          [item.quantity, returnId, item.order_item_id]
        );
      }
      refund = await refundsService.createAndProcessRefund(conn, {
        returnId,
        amount: order.total_amount,
      });
      if (refund.status === 'completed') {
        await conn.query('UPDATE ORDERS SET payment_status = ? WHERE order_id = ?', [
          PAYMENT_STATUS.REFUNDED,
          orderId,
        ]);
      }
    }

    await conn.commit();

    const [userRows] = await db.query('SELECT email, phone FROM USERS WHERE user_id = ?', [
      order.user_id,
    ]);
    const message =
      !needsRefund
        ? `Your order #${orderId} was cancelled. No refund is needed since no payment was collected.`
        : refund && refund.status === 'completed'
        ? `Your order #${orderId} was cancelled and your refund has been processed.`
        : `Your order #${orderId} was cancelled. We are processing your refund and will update you shortly.`;
    if (userRows.length) await notify.sendEmail(userRows[0].email, `Order #${orderId} cancelled`, message);

    return refund;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

function isValidBankInfo(bankInfo) {
  if (!bankInfo || !bankInfo.method) return false;
  if (bankInfo.method === 'bank') return !!(bankInfo.bank_name && bankInfo.account_number);
  if (bankInfo.method === 'card') return !!bankInfo.card_number;
  if (bankInfo.method === 'momo') return !!bankInfo.momo_number;
  return false;
}

// Customer self-service cancellation (BR-01: only while PREPARING). COD orders
// require bank_info (see formatBankInfoSummary) since cancelOrderCore now
// always attempts a refund for them too, not just online payment methods.
async function customerCancelOrder(orderId, reason, userId, bankInfo) {
  const [rows] = await db.query('SELECT * FROM ORDERS WHERE order_id = ?', [orderId]);
  if (!rows.length) throw new HttpError(404, 'Order not found');
  const order = rows[0];
  if (order.user_id !== userId) throw new HttpError(403, 'This is not your order');
  if (order.status !== CANCELLABLE_ORDER_STATUS) {
    throw new HttpError(400, 'This order can only be cancelled while it is being prepared');
  }
  if (order.payment_method === PAYMENT_METHOD.COD && !isValidBankInfo(bankInfo)) {
    throw new HttpError(400, 'Bank information is required to process a refund for COD orders');
  }
  await cancelOrderCore(orderId, reason || 'Cancelled by customer', userId, bankInfo);
  return getOrderDetail(orderId);
}

// Admin/staff override, same status guard as the customer path but no ownership check.
async function adminCancelOrder(orderId, reason, actorUserId) {
  const [rows] = await db.query('SELECT * FROM ORDERS WHERE order_id = ?', [orderId]);
  if (!rows.length) throw new HttpError(404, 'Order not found');
  if (![ORDER_STATUS.PENDING, ORDER_STATUS.PREPARING].includes(rows[0].status)) {
    throw new HttpError(400, 'Orders that are shipping or delivered can no longer be cancelled');
  }
  await cancelOrderCore(orderId, reason || 'Cancelled by admin', actorUserId);
  return getOrderDetail(orderId);
}

const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.SHIPPING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.SHIPPING]: [ORDER_STATUS.DELIVERED],
};

async function updateOrderStatus(orderId, newStatus, actorUserId) {
  const [rows] = await db.query('SELECT * FROM ORDERS WHERE order_id = ?', [orderId]);
  if (!rows.length) throw new HttpError(404, 'Order not found');
  const order = rows[0];

  if (newStatus === ORDER_STATUS.CANCELLED) return adminCancelOrder(orderId, 'Cancelled by admin', actorUserId);

  const allowed = ALLOWED_TRANSITIONS[order.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new HttpError(400, `Cannot move an order from "${order.status}" to "${newStatus}"`);
  }

  const fields = ['status = ?'];
  const params = [newStatus];
  if (newStatus === ORDER_STATUS.DELIVERED) {
    fields.push('delivered_at = NOW()');
  }
  params.push(orderId);
  await db.query(`UPDATE ORDERS SET ${fields.join(', ')} WHERE order_id = ?`, params);

  await auditLogsService.record(null, {
    action: 'status_change',
    entity_type: 'order',
    entity_id: orderId,
    from_status: order.status,
    to_status: newStatus,
    actor_user_id: actorUserId,
  });

  if (newStatus === ORDER_STATUS.DELIVERED) {
    const [[user]] = await db.query('SELECT email FROM USERS WHERE user_id = ?', [order.user_id]);
    await notify.sendEmail(user.email, `Order #${orderId} delivered`, 'Your order has been delivered. Enjoy your new terrarium!');
  }

  return getOrderDetail(orderId);
}

module.exports = {
  checkout,
  confirmPayment,
  getOrderDetail,
  listOrdersForUser,
  listOrdersAdmin,
  getOrderStatusCounts,
  trackOrder,
  customerCancelOrder,
  adminCancelOrder,
  updateOrderStatus,
  cancelOrderCore,
};
