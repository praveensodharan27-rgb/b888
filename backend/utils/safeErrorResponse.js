/**
 * Safe error response for API - prevents leaking stack traces and internal messages in production.
 */
const env = require('../src/config/env');

function getSafeErrorMessage(err, fallback = 'Internal server error') {
  if (env.NODE_ENV === 'production') return fallback;
  return err?.message || fallback;
}

function getSafeErrorPayload(err, fallbackMessage = 'Internal server error') {
  const payload = { success: false, message: getSafeErrorMessage(err, fallbackMessage) };
  if (env.NODE_ENV === 'development' && err?.stack) payload.stack = err.stack;
  return payload;
}

module.exports = { getSafeErrorMessage, getSafeErrorPayload };
