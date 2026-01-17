const { authorize } = require('./auth');

/**
 * Middleware to require admin role
 * This is a convenience wrapper around authorize('ADMIN')
 */
const requireAdmin = authorize('ADMIN');

module.exports = { requireAdmin };

