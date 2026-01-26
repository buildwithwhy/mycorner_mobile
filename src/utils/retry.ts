// Retry Utility
// Provides retry logic for async operations with exponential backoff

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry' | 'shouldRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

// Default: retry on network errors, not on 4xx errors
const defaultShouldRetry = (error: unknown): boolean => {
  // Retry on network errors
  if (error instanceof TypeError && error.message === 'Network request failed') {
    return true;
  }

  // Don't retry on HTTP client errors (4xx)
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: number }).status;
    if (status >= 400 && status < 500) {
      return false;
    }
  }

  // Retry on other errors (server errors, timeouts, etc.)
  return true;
};

// Sleep utility
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Retry an async operation with exponential backoff
 *
 * @example
 * const data = await retry(() => fetch('/api/data').then(r => r.json()));
 *
 * @example
 * const data = await retry(
 *   () => fetchUserData(userId),
 *   { maxRetries: 5, onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = DEFAULT_OPTIONS.maxRetries,
    initialDelay = DEFAULT_OPTIONS.initialDelay,
    maxDelay = DEFAULT_OPTIONS.maxDelay,
    backoffMultiplier = DEFAULT_OPTIONS.backoffMultiplier,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;

  let lastError: unknown;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt + 1, error);
      }

      // Wait before retrying
      await sleep(delay);

      // Increase delay for next retry (exponential backoff)
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Create a retryable version of an async function
 *
 * @example
 * const fetchWithRetry = withRetry(fetchData, { maxRetries: 3 });
 * const data = await fetchWithRetry(userId);
 */
export function withRetry<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retry(() => fn(...args), options);
}

export default retry;
