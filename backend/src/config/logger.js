/**
 * Structured logger (pino) for easy debugging and log aggregation.
 * - Development: pretty-printed, human-readable
 * - Production: JSON lines (for Datadog, CloudWatch, ELK, etc.)
 *
 * Use: logger.info('msg'), logger.error({ err, reqId }, 'msg'), logger.child({ requestId, userId })
 */

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';
const level = process.env.LOG_LEVEL || (isDev ? 'debug' : 'info');

const baseOptions = {
  level,
  base: {
    env: process.env.NODE_ENV,
    pid: process.pid,
  },
  // Redact sensitive keys from any logged object
  redact: {
    paths: ['password', 'token', 'authorization', 'cookie', 'req.headers.authorization', 'req.headers.cookie'],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

const logger = isDev
  ? pino({
      ...baseOptions,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      },
    })
  : pino(baseOptions);

/**
 * Create a child logger with bound context (e.g. requestId, userId, route).
 * Use in middleware: req.log = logger.child({ requestId: req.id, userId: req.user?.id })
 */
function child(bindings) {
  return logger.child(bindings);
}

/**
 * Log an error with optional request context. Use in error handlers.
 * logger.logError(err, { requestId: req.id, path: req.path, method: req.method })
 */
function logError(err, context = {}) {
  const payload = {
    ...context,
    err: err && err.stack ? { message: err.message, stack: err.stack, name: err.name } : err,
  };
  logger.error(payload, err && err.message || 'Error');
}

module.exports = {
  logger,
  child,
  logError,
};
