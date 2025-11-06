/**
 * Retry utility with exponential backoff
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param options Retry options
 * @returns Promise that resolves with the function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if it's the last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Log retry attempt
      console.warn(
        `Attempt ${attempt}/${opts.maxAttempts} failed. Retrying in ${delay}ms...`,
        error
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay with exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelay);
    }
  }

  // If we get here, all attempts failed
  throw lastError || new Error('All retry attempts failed');
}

/**
 * Retry a Supabase query with exponential backoff
 * Specifically handles Supabase error types
 */
export async function retrySupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: Error | null }>,
  options: RetryOptions = {}
): Promise<{ data: T | null; error: Error | null }> {
  return retry(async () => {
    const result = await queryFn();

    // If there's an error, throw it so retry can catch it
    if (result.error) {
      throw result.error;
    }

    return result;
  }, options);
}
