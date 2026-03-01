/**
 * Rate-limited logging to reduce repeated error noise.
 * Same log key is only emitted once per intervalMs.
 */

const DEFAULT_INTERVAL_MS = 60 * 1000; // 1 minute

const lastLog = new Map(); // key -> { at }

function shouldLog(key, intervalMs = DEFAULT_INTERVAL_MS) {
  const now = Date.now();
  const prev = lastLog.get(key);
  if (!prev) {
    lastLog.set(key, { at: now });
    return true;
  }
  if (now - prev.at >= intervalMs) {
    lastLog.set(key, { at: now });
    return true;
  }
  return false;
}

/**
 * @param {object} logger - pino logger (or console) with .warn .error .info
 * @param {number} [intervalMs] - min ms between same key
 * @returns {{ warn: Function, error: Function, info: Function }}
 */
function createRateLimitedLogger(logger, intervalMs = DEFAULT_INTERVAL_MS) {
  return {
    warn(key, ...args) {
      if (shouldLog(key, intervalMs)) {
        if (typeof logger.warn === 'function') {
          logger.warn(...args);
        }
      }
    },
    error(key, ...args) {
      if (shouldLog(key, intervalMs)) {
        if (typeof logger.error === 'function') {
          logger.error(...args);
        }
      }
    },
    info(key, ...args) {
      if (shouldLog(key, intervalMs)) {
        if (typeof logger.info === 'function') {
          logger.info(...args);
        }
      }
    },
  };
}

module.exports = {
  shouldLog,
  createRateLimitedLogger,
  DEFAULT_INTERVAL_MS,
};
