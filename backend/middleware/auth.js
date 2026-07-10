const jwt = require('jsonwebtoken');
const HttpError = require('../utils/http-error');
const { STAFF_ROLES } = require('../utils/constants');

function getToken(req) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme === 'Bearer' && token) return token;
  return null;
}

// Populates req.user if a valid token is present, but never blocks the request.
// Used on routes that behave differently for guests vs customers (cart, checkout).
function optionalAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // Ignore invalid/expired tokens on optional routes; treat as guest.
  }
  next();
}

// Requires a valid token; used on customer/staff/admin-only routes.
function requireAuth(req, res, next) {
  const token = getToken(req);
  if (!token) return next(new HttpError(401, 'Authentication required'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    next(new HttpError(401, 'Invalid or expired session'));
  }
}

function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) return next(new HttpError(401, 'Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(new HttpError(403, 'You do not have permission to perform this action'));
    }
    next();
  };
}

const requireStaff = requireRole(...STAFF_ROLES);
const requireAdmin = requireRole('admin');

module.exports = { optionalAuth, requireAuth, requireRole, requireStaff, requireAdmin };
