// Development-only logger
// These logs are disabled in production builds

const isDev = __DEV__;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  error: (...args: any[]) => {
    if (isDev) console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  debug: (...args: any[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
};

export default logger;
