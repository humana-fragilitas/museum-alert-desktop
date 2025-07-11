import { FormControl } from '@angular/forms';
import { validateEddystoneUrl } from '../helpers/eddystone-url.helper';
import { eddystoneUrlValidator } from './eddystone-encoded-url.validator';

// Mock the helper function
jest.mock('../helpers/eddystone-url.helper', () => ({
  validateEddystoneUrl: jest.fn()
}));

describe('EddystoneUrlValidator', () => {
  let validator: ReturnType<typeof eddystoneUrlValidator>;
  let mockValidateEddystoneUrl: jest.MockedFunction<typeof validateEddystoneUrl>;

  beforeEach(() => {
    validator = eddystoneUrlValidator();
    mockValidateEddystoneUrl = validateEddystoneUrl as jest.MockedFunction<typeof validateEddystoneUrl>;
    jest.clearAllMocks();
  });

  describe('when control value is empty', () => {
    it('should return null for null value', () => {
      const control = new FormControl(null);
      const result = validator(control);
      
      expect(result).toBeNull();
      expect(mockValidateEddystoneUrl).not.toHaveBeenCalled();
    });

    it('should return null for undefined value', () => {
      const control = new FormControl(undefined);
      const result = validator(control);
      
      expect(result).toBeNull();
      expect(mockValidateEddystoneUrl).not.toHaveBeenCalled();
    });

    it('should return null for empty string', () => {
      const control = new FormControl('');
      const result = validator(control);
      
      expect(result).toBeNull();
      expect(mockValidateEddystoneUrl).not.toHaveBeenCalled();
    });
  });

  describe('when control value is present', () => {
    it('should return null for valid URL', () => {
      const testUrl = 'https://example.com';
      const control = new FormControl(testUrl);
      
      mockValidateEddystoneUrl.mockReturnValue({
        valid: true,
        encodedLength: 15,
        error: ''
      });

      const result = validator(control);
      
      expect(result).toBeNull();
      expect(mockValidateEddystoneUrl).toHaveBeenCalledWith(testUrl);
      expect(mockValidateEddystoneUrl).toHaveBeenCalledTimes(1);
    });

    it('should return validation error for invalid URL', () => {
      const testUrl = 'https://very-long-url-that-exceeds-eddystone-limit.com';
      const control = new FormControl(testUrl);
      
      mockValidateEddystoneUrl.mockReturnValue({
        valid: false,
        encodedLength: 25,
        error: 'URL too long for Eddystone encoding'
      });

      const result = validator(control);
      
      expect(result).toEqual({
        eddystoneUrl: {
          value: testUrl,
          encodedLength: 25,
          maxLength: 18,
          error: 'URL too long for Eddystone encoding'
        }
      });
      expect(mockValidateEddystoneUrl).toHaveBeenCalledWith(testUrl);
      expect(mockValidateEddystoneUrl).toHaveBeenCalledTimes(1);
    });

    it('should handle malformed URLs', () => {
      const testUrl = 'not-a-valid-url';
      const control = new FormControl(testUrl);
      
      mockValidateEddystoneUrl.mockReturnValue({
        valid: false,
        encodedLength: 0,
        error: 'Invalid URL format'
      });

      const result = validator(control);
      
      expect(result).toEqual({
        eddystoneUrl: {
          value: testUrl,
          encodedLength: 0,
          maxLength: 18,
          error: 'Invalid URL format'
        }
      });
      expect(mockValidateEddystoneUrl).toHaveBeenCalledWith(testUrl);
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace-only strings', () => {
      const control = new FormControl('   ');
      
      mockValidateEddystoneUrl.mockReturnValue({
        valid: false,
        encodedLength: 0,
        error: 'Invalid URL format'
      });

      const result = validator(control);
      
      expect(result).toEqual({
        eddystoneUrl: {
          value: '   ',
          encodedLength: 0,
          maxLength: 18,
          error: 'Invalid URL format'
        }
      });
      expect(mockValidateEddystoneUrl).toHaveBeenCalledWith('   ');
    });

    it('should handle URL at exact limit', () => {
      const testUrl = 'https://ex.co';
      const control = new FormControl(testUrl);
      
      mockValidateEddystoneUrl.mockReturnValue({
        valid: true,
        encodedLength: 18,
        error: ''
      });

      const result = validator(control);
      
      expect(result).toBeNull();
      expect(mockValidateEddystoneUrl).toHaveBeenCalledWith(testUrl);
    });

    it('should handle URL just over limit', () => {
      const testUrl = 'https://example.co';
      const control = new FormControl(testUrl);
      
      mockValidateEddystoneUrl.mockReturnValue({
        valid: false,
        encodedLength: 19,
        error: 'URL exceeds 18-byte limit'
      });

      const result = validator(control);
      
      expect(result).toEqual({
        eddystoneUrl: {
          value: testUrl,
          encodedLength: 19,
          maxLength: 18,
          error: 'URL exceeds 18-byte limit'
        }
      });
    });
  });

  describe('validator factory', () => {
    it('should return a function', () => {
      const validatorFn = eddystoneUrlValidator();
      expect(typeof validatorFn).toBe('function');
    });

    it('should create independent validator instances', () => {
      const validator1 = eddystoneUrlValidator();
      const validator2 = eddystoneUrlValidator();
      
      expect(validator1).not.toBe(validator2);
      expect(typeof validator1).toBe('function');
      expect(typeof validator2).toBe('function');
    });
  });
});