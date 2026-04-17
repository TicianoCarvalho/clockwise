
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}


/**
 * Retries a function with exponential backoff, or respects the API's suggested delay.
 * @param fn The async function to retry.
 * @param maxRetries The maximum number of retries.
 * @param onRetry A callback function that is called when a retry is scheduled.
 * @returns The result of the function if it succeeds.
 * @throws The error of the last attempt if all retries fail.
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>, 
  maxRetries = 3,
  onRetry?: (delay: number, attempt: number) => void
): Promise<T> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const isRateLimitError = e.message?.includes('429') || e.message?.includes('RESOURCE_EXHAUSTED');
      
      // Re-throw if it's not a rate limit error or if we've exhausted retries.
      if (!isRateLimitError || i === maxRetries - 1) {
          throw e;
      }
      
      // Check if the API suggested a retry delay
      const retryAfterMatch = e.message.match(/Please retry in ([\d.]+)s/);
      let delay = 1000 * Math.pow(2, i); // Default exponential backoff

      if (retryAfterMatch && retryAfterMatch[1]) {
        const suggestedSeconds = parseFloat(retryAfterMatch[1]);
        if (!isNaN(suggestedSeconds)) {
            // Use suggested delay, add a small buffer
            delay = suggestedSeconds * 1000 + 500;
        }
      }
      
      onRetry?.(delay, i + 1);
      
      console.warn(`Rate limit hit. Retrying in ${Math.round(delay / 1000)}s... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  // This is for type safety and should not be reached if maxRetries > 0.
  throw new Error('Quota exceeded after multiple retries.');
};
