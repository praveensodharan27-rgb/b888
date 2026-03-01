const crypto = require('crypto');

const HEADER = 'x-request-id';

/**
 * Attach a unique request ID to each request (for tracing logs).
 * Uses X-Request-Id from client if present, otherwise generates one.
 */
function requestId(req, res, next) {
  const id = req.headers[HEADER] || crypto.randomBytes(8).toString('hex');
  req.id = id;
  res.setHeader(HEADER, id);
  next();
}

module.exports = { requestId };
