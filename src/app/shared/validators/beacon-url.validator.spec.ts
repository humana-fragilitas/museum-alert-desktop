import { FormControl } from '@angular/forms';
import { beaconUrlValidator } from './beacon-url.validator';
import { urlValidator } from './url.validator';
import { firstLevelDomainValidator } from './first-level-domain.validator';
import { eddystoneUrlValidator } from './eddystone-encoded-url.validator';

// Mock the imported validators
jest.mock('./url.validator');
jest.mock('./first-level-domain.validator');
jest.mock('./eddystone-encoded-url.validator');

describe('beaconUrlValidator', () => {
  let validator: ReturnType<typeof beaconUrlValidator>;
  let mockUrlValidator: jest.MockedFunction<typeof urlValidator>;
  let mockFirstLevelDomainValidator: jest.MockedFunction<typeof firstLevelDomainValidator>;
  let mockEddystoneUrlValidator: jest.MockedFunction<typeof eddystoneUrlValidator>;

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    // Cast the mocked functions to get proper typing
    mockUrlValidator = urlValidator as jest.MockedFunction<typeof urlValidator>;
    mockFirstLevelDomainValidator = firstLevelDomainValidator as jest.MockedFunction<typeof firstLevelDomainValidator>;
    mockEddystoneUrlValidator = eddystoneUrlValidator as jest.MockedFunction<typeof eddystoneUrlValidator>;

    // Setup default mock implementations
    mockUrlValidator.mockReturnValue(() => null);
    mockFirstLevelDomainValidator.mockReturnValue(() => null);
    mockEddystoneUrlValidator.mockReturnValue(() => null);

    validator = beaconUrlValidator();
  });

  describe('when control value is empty', () => {
    it('should return null for null value', () => {
      const control = new FormControl(null);
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    it('should return null for undefined value', () => {
      const control = new FormControl(undefined);
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const control = new FormControl('');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    it('should not call any validators when value is empty', () => {
      const control = new FormControl('');
      validator(control);
      
      expect(mockUrlValidator).not.toHaveBeenCalled();
      expect(mockFirstLevelDomainValidator).not.toHaveBeenCalled();
      expect(mockEddystoneUrlValidator).not.toHaveBeenCalled();
    });
  });

  describe('when URL validation fails', () => {
    it('should return URL validation error and not call other validators', () => {
      const urlError = { invalidUrl: true };
      mockUrlValidator.mockReturnValue(() => urlError);

      const control = new FormControl('invalid-url');
      const result = validator(control);

      expect(result).toEqual(urlError);
      expect(mockUrlValidator).toHaveBeenCalledTimes(1);
      expect(mockFirstLevelDomainValidator).not.toHaveBeenCalled();
      expect(mockEddystoneUrlValidator).not.toHaveBeenCalled();
    });

    it('should pass the control to URL validator', () => {
      const urlError = { invalidUrl: true };
      const mockUrlValidatorFn = jest.fn().mockReturnValue(urlError);
      mockUrlValidator.mockReturnValue(mockUrlValidatorFn);

      const control = new FormControl('invalid-url');
      validator(control);

      expect(mockUrlValidatorFn).toHaveBeenCalledWith(control);
    });
  });

  describe('when URL validation passes but domain validation fails', () => {
    it('should return domain validation error and not call Eddystone validator', () => {
      const domainError = { invalidDomain: true };
      mockUrlValidator.mockReturnValue(() => null);
      mockFirstLevelDomainValidator.mockReturnValue(() => domainError);

      const control = new FormControl('https://invalid-domain.xyz');
      const result = validator(control);

      expect(result).toEqual(domainError);
      expect(mockUrlValidator).toHaveBeenCalledTimes(1);
      expect(mockFirstLevelDomainValidator).toHaveBeenCalledTimes(1);
      expect(mockEddystoneUrlValidator).not.toHaveBeenCalled();
    });

    it('should pass the control to domain validator', () => {
      const domainError = { invalidDomain: true };
      const mockDomainValidatorFn = jest.fn().mockReturnValue(domainError);
      mockUrlValidator.mockReturnValue(() => null);
      mockFirstLevelDomainValidator.mockReturnValue(mockDomainValidatorFn);

      const control = new FormControl('https://invalid-domain.xyz');
      validator(control);

      expect(mockDomainValidatorFn).toHaveBeenCalledWith(control);
    });
  });

  describe('when URL and domain validation pass but Eddystone validation fails', () => {
    it('should return Eddystone validation error', () => {
      const eddystoneError = { invalidEddystoneUrl: true };
      mockUrlValidator.mockReturnValue(() => null);
      mockFirstLevelDomainValidator.mockReturnValue(() => null);
      mockEddystoneUrlValidator.mockReturnValue(() => eddystoneError);

      const control = new FormControl('https://very-long-domain-name-that-cannot-be-encoded.com');
      const result = validator(control);

      expect(result).toEqual(eddystoneError);
      expect(mockUrlValidator).toHaveBeenCalledTimes(1);
      expect(mockFirstLevelDomainValidator).toHaveBeenCalledTimes(1);
      expect(mockEddystoneUrlValidator).toHaveBeenCalledTimes(1);
    });

    it('should pass the control to Eddystone validator', () => {
      const eddystoneError = { invalidEddystoneUrl: true };
      const mockEddystoneValidatorFn = jest.fn().mockReturnValue(eddystoneError);
      mockUrlValidator.mockReturnValue(() => null);
      mockFirstLevelDomainValidator.mockReturnValue(() => null);
      mockEddystoneUrlValidator.mockReturnValue(mockEddystoneValidatorFn);

      const control = new FormControl('https://example.com');
      validator(control);

      expect(mockEddystoneValidatorFn).toHaveBeenCalledWith(control);
    });
  });

  describe('when all validations pass', () => {
    it('should return null', () => {
      mockUrlValidator.mockReturnValue(() => null);
      mockFirstLevelDomainValidator.mockReturnValue(() => null);
      mockEddystoneUrlValidator.mockReturnValue(() => null);

      const control = new FormControl('https://example.com');
      const result = validator(control);

      expect(result).toBeNull();
      expect(mockUrlValidator).toHaveBeenCalledTimes(1);
      expect(mockFirstLevelDomainValidator).toHaveBeenCalledTimes(1);
      expect(mockEddystoneUrlValidator).toHaveBeenCalledTimes(1);
    });

    it('should call all validators in the correct order', () => {
      const callOrder: string[] = [];
      
      mockUrlValidator.mockReturnValue(() => {
        callOrder.push('url');
        return null;
      });
      mockFirstLevelDomainValidator.mockReturnValue(() => {
        callOrder.push('domain');
        return null;
      });
      mockEddystoneUrlValidator.mockReturnValue(() => {
        callOrder.push('eddystone');
        return null;
      });

      const control = new FormControl('https://example.com');
      validator(control);

      expect(callOrder).toEqual(['url', 'domain', 'eddystone']);
    });
  });

  describe('validator factory function', () => {
    it('should return a validator function', () => {
      const validatorFn = beaconUrlValidator();
      expect(typeof validatorFn).toBe('function');
    });

    it('should create independent validator instances', () => {
      const validator1 = beaconUrlValidator();
      const validator2 = beaconUrlValidator();
      
      expect(validator1).not.toBe(validator2);
    });
  });

  describe('edge cases', () => {
    it('should handle whitespace-only values as non-empty (truthy)', () => {
      const control = new FormControl('   ');
      const result = validator(control);
      
      // Whitespace string is truthy, so validators should be called
      expect(mockUrlValidator).toHaveBeenCalledTimes(1);
    });

    it('should handle non-string values', () => {
      const control = new FormControl(123);
      const result = validator(control);
      
      // Should not return null since value is truthy
      expect(mockUrlValidator).toHaveBeenCalledTimes(1);
    });

    it('should handle boolean false as empty', () => {
      const control = new FormControl(false);
      const result = validator(control);
      
      expect(result).toBeNull();
      expect(mockUrlValidator).not.toHaveBeenCalled();
    });

    it('should handle zero as empty (falsy)', () => {
      const control = new FormControl(0);
      const result = validator(control);
      
      // Zero is falsy, so validators should not be called
      expect(result).toBeNull();
      expect(mockUrlValidator).not.toHaveBeenCalled();
    });
  });

  describe('error propagation', () => {
    it('should preserve complex error objects from URL validator', () => {
      const complexError = {
        invalidUrl: true,
        message: 'Invalid URL format',
        details: { protocol: 'missing' }
      };
      mockUrlValidator.mockReturnValue(() => complexError);

      const control = new FormControl('invalid-url');
      const result = validator(control);

      expect(result).toEqual(complexError);
    });

    it('should preserve complex error objects from domain validator', () => {
      const complexError = {
        invalidDomain: true,
        message: 'Domain not allowed',
        allowedDomains: ['com', 'org', 'net']
      };
      mockUrlValidator.mockReturnValue(() => null);
      mockFirstLevelDomainValidator.mockReturnValue(() => complexError);

      const control = new FormControl('https://example.xyz');
      const result = validator(control);

      expect(result).toEqual(complexError);
    });

    it('should preserve complex error objects from Eddystone validator', () => {
      const complexError = {
        invalidEddystoneUrl: true,
        message: 'URL too long for Eddystone encoding',
        maxLength: 17,
        actualLength: 25
      };
      mockUrlValidator.mockReturnValue(() => null);
      mockFirstLevelDomainValidator.mockReturnValue(() => null);
      mockEddystoneUrlValidator.mockReturnValue(() => complexError);

      const control = new FormControl('https://very-long-domain.com');
      const result = validator(control);

      expect(result).toEqual(complexError);
    });
  });
});