const db = require('../config/db');
const HttpError = require('../utils/http-error');
const { VOUCHER_STATUS } = require('../utils/constants');
const { toMysqlDatetime } = require('../utils/mysql-datetime');

async function listVouchers() {
  const [rows] = await db.query('SELECT * FROM VOUCHERS ORDER BY voucher_id DESC');
  return rows;
}

// Public-facing subset (no created_by/used_count) for the cart's "available vouchers" panel.
async function listActiveVouchers() {
  const [rows] = await db.query(
    `SELECT voucher_id, code, discount_type, discount_value, min_order_value, end_at FROM VOUCHERS
     WHERE status = 'active' AND NOW() BETWEEN start_at AND end_at
     AND (max_usage = 0 OR used_count < max_usage)
     ORDER BY discount_value DESC`
  );
  return rows;
}

function validateInput({ code, discount_type, discount_value, start_at, end_at }) {
  if (!code || !discount_type || discount_value === undefined || !start_at || !end_at) {
    throw new HttpError(400, 'Code, discount type/value, start and end dates are required');
  }
  if (!['percent', 'fixed'].includes(discount_type)) {
    throw new HttpError(400, 'Discount type must be "percent" or "fixed"');
  }
  if (new Date(end_at) <= new Date(start_at)) {
    throw new HttpError(400, 'End date must be after the start date'); // BR: 1.7.2
  }
}

async function createVoucher(adminUserId, body) {
  validateInput(body);
  const { code, discount_type, discount_value, min_order_value = 0, max_usage = 0, start_at, end_at } =
    body;

  const [existing] = await db.query('SELECT voucher_id FROM VOUCHERS WHERE code = ?', [code]);
  if (existing.length) throw new HttpError(409, 'A voucher with this code already exists');

  const [result] = await db.query(
    `INSERT INTO VOUCHERS (created_by_user_id, code, discount_type, discount_value, min_order_value, max_usage, start_at, end_at, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')`,
    [
      adminUserId,
      code,
      discount_type,
      discount_value,
      min_order_value,
      max_usage,
      toMysqlDatetime(start_at),
      toMysqlDatetime(end_at),
    ]
  );
  const [rows] = await db.query('SELECT * FROM VOUCHERS WHERE voucher_id = ?', [result.insertId]);
  return rows[0];
}

async function updateVoucher(id, body) {
  const [existing] = await db.query('SELECT * FROM VOUCHERS WHERE voucher_id = ?', [id]);
  if (!existing.length) throw new HttpError(404, 'Voucher not found');

  const merged = { ...existing[0], ...body };
  validateInput(merged);

  const fields = [
    'code',
    'discount_type',
    'discount_value',
    'min_order_value',
    'max_usage',
    'start_at',
    'end_at',
    'status',
  ];
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
    await db.query(`UPDATE VOUCHERS SET ${sets.join(', ')} WHERE voucher_id = ?`, params);
  }
  const [rows] = await db.query('SELECT * FROM VOUCHERS WHERE voucher_id = ?', [id]);
  return rows[0];
}

async function deleteVoucher(id) {
  const [result] = await db.query('DELETE FROM VOUCHERS WHERE voucher_id = ?', [id]);
  if (!result.affectedRows) throw new HttpError(404, 'Voucher not found');
}

// Checks eligibility only; does not mark the voucher as used (that happens at order creation).
async function checkVoucher(code, subtotal, conn = db) {
  const [rows] = await conn.query('SELECT * FROM VOUCHERS WHERE code = ?', [code]);
  if (!rows.length) throw new HttpError(404, 'Voucher code not found');
  const voucher = rows[0];

  if (voucher.status !== VOUCHER_STATUS.ACTIVE) {
    throw new HttpError(400, 'This voucher is no longer active');
  }
  const now = new Date();
  if (now < new Date(voucher.start_at) || now > new Date(voucher.end_at)) {
    throw new HttpError(400, 'This voucher has expired or is not yet active');
  }
  if (voucher.max_usage > 0 && voucher.used_count >= voucher.max_usage) {
    throw new HttpError(400, 'This voucher has reached its usage limit');
  }
  if (Number(subtotal) < Number(voucher.min_order_value)) {
    throw new HttpError(
      400,
      `This voucher requires a minimum order value of ${voucher.min_order_value}`
    );
  }

  const discount =
    voucher.discount_type === 'percent'
      ? (Number(subtotal) * Number(voucher.discount_value)) / 100
      : Number(voucher.discount_value);

  return { voucher, discount_amount: Math.min(discount, Number(subtotal)) };
}

// Called inside the checkout transaction; locks the row and increments used_count.
async function applyVoucher(conn, code, subtotal) {
  const [rows] = await conn.query('SELECT * FROM VOUCHERS WHERE code = ? FOR UPDATE', [code]);
  if (!rows.length) throw new HttpError(404, 'Voucher code not found');
  const { discount_amount } = await checkVoucher(code, subtotal, conn);
  await conn.query('UPDATE VOUCHERS SET used_count = used_count + 1 WHERE voucher_id = ?', [
    rows[0].voucher_id,
  ]);
  return { voucher: rows[0], discount_amount };
}

module.exports = {
  listVouchers,
  listActiveVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  checkVoucher,
  applyVoucher,
};
