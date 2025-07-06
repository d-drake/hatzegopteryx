import { AxiosError } from 'axios';

// Retry helper function for API requests
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Handle 429 rate limit errors with special logic
      if (error instanceof AxiosError && error.response?.status === 429) {
        // Get retry-after header if available
        const retryAfter = error.response.headers['retry-after'];
        let waitTime = delay;
        
        if (retryAfter) {
          // If retry-after is a number, it's seconds
          // If it contains a date, parse it
          waitTime = isNaN(Number(retryAfter)) 
            ? new Date(retryAfter).getTime() - Date.now()
            : Number(retryAfter) * 1000;
          
          // Ensure minimum wait time
          waitTime = Math.max(waitTime, delay);
        } else {
          // Use exponential backoff for rate limiting
          waitTime = delay * Math.pow(2, attempt);
        }
        
        // Rate limit hit (429). Waiting before retry
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // Only retry on network errors, timeouts, 5xx server errors, or JSON parsing errors
      const shouldRetry = error instanceof AxiosError && 
          (error.code === 'ECONNABORTED' || 
           !error.response || 
           error.response.status >= 500 ||
           error.message?.includes('JSON') ||
           error.message?.includes('Invalid JSON response'));
           
      if (shouldRetry) {
        // Request failed, retrying
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      } else {
        throw error; // Don't retry client errors
      }
    }
  }
  throw new Error('Max retries exceeded');
}