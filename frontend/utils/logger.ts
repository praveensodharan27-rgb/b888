/**
 * Conditional Logger Utility
 * Only logs in development mode to prevent performance issues in production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
  /**
   * Log general information (development only)
   */
  log: (...args: any[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * Log warnings (development only)
   */
  warn: (...args: any[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * Log errors (always logged, even in production)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Log debug information (development only)
   */
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * Log info (development only)
   */
  info: (...args: any[]) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * Group logs (development only)
   */
  group: (label: string) => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  /**
   * End group (development only)
   */
  groupEnd: () => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  /**
   * Log table (development only)
   */
  table: (data: any) => {
    if (isDevelopment) {
      console.table(data);
    }
  },

  /**
   * Time measurement (development only)
   */
  time: (label: string) => {
    if (isDevelopment) {
      console.time(label);
    }
  },

  /**
   * End time measurement (development only)
   */
  timeEnd: (label: string) => {
    if (isDevelopment) {
      console.timeEnd(label);
    }
  },
};

export default logger;
