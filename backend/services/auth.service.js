const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/db');
const HttpError = require('../utils/http-error');
const notify = require('../utils/notify');
const { USER_ROLE } = require('../utils/constants');

const PUBLIC_USER_FIELDS =
  'user_id, full_name, email, phone, role, status, gender, is_flagged, created_at';

// Schema note: USERS has no reset-code/token column, so password reset state
// lives in memory (like the other simulated channels in utils/notify.js).
// This means codes are lost on server restart and don't work across multiple
// backend instances — acceptable for this build, would need a real store
// (Redis, or a schema column) in production.
const RESET_CODE_TTL_MS = 10 * 60 * 1000;
const resetCodes = new Map(); // email -> { code, expiresAt }

function signToken(user) {
  return jwt.sign(
    { user_id: user.user_id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// Guests always register as plain customers; staff/admin accounts are provisioned directly in the DB.
async function register({ full_name, email, phone, password, gender }) {
  if (!full_name || !email || !password) {
    throw new HttpError(400, 'Full name, email and password are required');
  }
  if (password.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }

  const [existing] = await db.query('SELECT user_id FROM USERS WHERE email = ?', [email]);
  if (existing.length) throw new HttpError(409, 'An account with this email already exists');

  const hashed = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    `INSERT INTO USERS (full_name, email, phone, role, status, gender, password)
     VALUES (?, ?, ?, ?, 'active', ?, ?)`,
    [full_name, email, phone || null, USER_ROLE.CUSTOMER, gender || null, hashed]
  );

  const [rows] = await db.query(`SELECT ${PUBLIC_USER_FIELDS} FROM USERS WHERE user_id = ?`, [
    result.insertId,
  ]);
  const user = rows[0];
  return { user, token: signToken(user) };
}

async function login({ email, password }) {
  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  const [rows] = await db.query('SELECT * FROM USERS WHERE email = ?', [email]);
  const user = rows[0];
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const match = await bcrypt.compare(password, user.password);
  if (!match) throw new HttpError(401, 'Invalid email or password');

  if (user.status !== 'active') {
    throw new HttpError(403, 'This account is not active. Please contact support.');
  }

  delete user.password;
  return { user, token: signToken(user) };
}

async function getById(userId) {
  const [rows] = await db.query(`SELECT ${PUBLIC_USER_FIELDS} FROM USERS WHERE user_id = ?`, [
    userId,
  ]);
  if (!rows.length) throw new HttpError(404, 'User not found');
  return rows[0];
}

async function requestPasswordReset(email) {
  if (!email) throw new HttpError(400, 'Email is required');
  const [rows] = await db.query('SELECT user_id FROM USERS WHERE email = ?', [email]);
  // Always respond the same way whether or not the account exists, so the
  // endpoint can't be used to enumerate registered emails.
  if (rows.length) {
    const code = crypto.randomInt(100000, 999999).toString();
    resetCodes.set(email, { code, expiresAt: Date.now() + RESET_CODE_TTL_MS });
    await notify.sendEmail(email, 'Your GreenDrop verification code', `Your code is ${code}. It expires in 10 minutes.`);
  }
  return { message: 'If an account exists for this email, a verification code has been sent.' };
}

function verifyResetCode(email, code) {
  const entry = resetCodes.get(email);
  if (!entry || entry.code !== code || Date.now() > entry.expiresAt) {
    throw new HttpError(400, 'Invalid or expired verification code');
  }
  return jwt.sign({ email, purpose: 'password_reset' }, process.env.JWT_SECRET, {
    expiresIn: '10m',
  });
}

async function resetPassword(resetToken, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new HttpError(400, 'Password must be at least 6 characters');
  }
  let payload;
  try {
    payload = jwt.verify(resetToken, process.env.JWT_SECRET);
  } catch (err) {
    throw new HttpError(400, 'Invalid or expired reset session. Please request a new code.');
  }
  if (payload.purpose !== 'password_reset') throw new HttpError(400, 'Invalid reset session');

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE USERS SET password = ? WHERE email = ?', [hashed, payload.email]);
  resetCodes.delete(payload.email);
}

async function changePassword(userId, currentPassword, newPassword) {
  if (!newPassword || newPassword.length < 6) {
    throw new HttpError(400, 'New password must be at least 6 characters');
  }
  const [rows] = await db.query('SELECT password FROM USERS WHERE user_id = ?', [userId]);
  if (!rows.length) throw new HttpError(404, 'User not found');

  const match = await bcrypt.compare(currentPassword || '', rows[0].password);
  if (!match) throw new HttpError(401, 'Current password is incorrect');

  const hashed = await bcrypt.hash(newPassword, 10);
  await db.query('UPDATE USERS SET password = ? WHERE user_id = ?', [hashed, userId]);
}

module.exports = {
  register,
  login,
  getById,
  requestPasswordReset,
  verifyResetCode,
  resetPassword,
  changePassword,
  PUBLIC_USER_FIELDS,
};
