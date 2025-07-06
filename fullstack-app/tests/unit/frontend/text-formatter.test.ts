import { uppercaseWithExceptions } from '../../../frontend/src/lib/formatters/textFormatter';

describe('Text Formatter', () => {
  describe('uppercaseWithExceptions', () => {
    it('should preserve lowercase sigma character', () => {
      const result = uppercaseWithExceptions('CD 6σ');
      expect(result).toBe('CD 6σ');
    });

    it('should uppercase regular text', () => {
      const result = uppercaseWithExceptions('cd att');
      expect(result).toBe('CD ATT');
    });

    it('should handle mixed case with sigma', () => {
      const result = uppercaseWithExceptions('process date');
      expect(result).toBe('PROCESS DATE');
    });

    it('should preserve sigma in complex strings', () => {
      const result = uppercaseWithExceptions('Critical Dimension 6σ Measurement');
      expect(result).toBe('CRITICAL DIMENSION 6σ MEASUREMENT');
    });

    it('should handle multiple sigma characters', () => {
      const result = uppercaseWithExceptions('σ value and 6σ limit');
      expect(result).toBe('σ VALUE AND 6σ LIMIT');
    });

    it('should handle empty string', () => {
      const result = uppercaseWithExceptions('');
      expect(result).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(uppercaseWithExceptions(null as any)).toBe(null);
      expect(uppercaseWithExceptions(undefined as any)).toBe(undefined);
    });

    it('should handle strings without sigma', () => {
      const result = uppercaseWithExceptions('entity');
      expect(result).toBe('ENTITY');
    });

    it('should handle strings with only sigma', () => {
      const result = uppercaseWithExceptions('σ');
      expect(result).toBe('σ');
    });

    it('should preserve spacing and punctuation', () => {
      const result = uppercaseWithExceptions('CD X-Y');
      expect(result).toBe('CD X-Y');
    });
  });
});