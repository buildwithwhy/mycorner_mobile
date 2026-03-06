// Logger utility with environment-aware logging
// Respects ENABLE_DEBUG_LOGGING from config

import { ENABLE_DEBUG_LOGGING, APP_ENV } from '../../config';
import { captureException } from '../services/sentry';

// Use both __DEV__ and our config flag for maximum control
const shouldLog = __DEV__ && ENABLE_DEBUG_LOGGING;

export const logger = {
  log: (...args: unknown[]) => {
    if (shouldLog) console.log(...args);
  },
  error: (...args: unknown[]) => {
    // Always log errors, even in production
    console.error(...args);
    // Forward Error objects to Sentry in production
    if (!__DEV__) {
      const err = args.find((a) => a instanceof Error);
      if (err instanceof Error) captureException(err);
    }
  },
  warn: (...args: unknown[]) => {
    if (shouldLog) console.warn(...args);
  },
  debug: (...args: unknown[]) => {
    if (shouldLog) console.log(`[DEBUG][${APP_ENV}]`, ...args);
  },
  // Log environment info on app start
  logEnvInfo: () => {
    if (shouldLog) {
      console.log('=====================================');
      console.log(`MyCorner App - Environment: ${APP_ENV.toUpperCase()}`);
      console.log(`Debug Logging: ${ENABLE_DEBUG_LOGGING ? 'ON' : 'OFF'}`);
      console.log('=====================================');
    }
  },
};

export default logger;
