const HttpError = require('../utils/http-error');

// Consistent JSON error shape, and never leak raw DB/driver errors to the client.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof HttpError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File is too large (max 5MB)' });
  }
  if (err && err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ error: err.message });
  }

  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Something went wrong. Please try again later.' });
}

module.exports = errorHandler;
