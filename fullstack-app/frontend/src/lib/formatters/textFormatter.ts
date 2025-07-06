/**
 * Text formatting utilities for consistent text presentation
 */

/**
 * Converts text to uppercase while preserving specific characters that should remain lowercase
 * Currently preserves the Greek sigma character (σ) in lowercase
 * 
 * @param text - The text to format
 * @returns The formatted text with selective uppercase transformation
 */
export function uppercaseWithExceptions(text: string): string {
  if (!text) return text;
  
  // Define characters that should remain lowercase
  const preserveLowercase = ['σ']; // Greek sigma character
  
  // Convert to uppercase first
  let result = text.toUpperCase();
  
  // Restore specific characters to lowercase
  preserveLowercase.forEach(char => {
    // Use a global regex to replace all occurrences
    const upperChar = char.toUpperCase();
    const regex = new RegExp(upperChar, 'g');
    result = result.replace(regex, char);
  });
  
  return result;
}

/**
 * Additional text formatting utilities can be added here as needed
 */