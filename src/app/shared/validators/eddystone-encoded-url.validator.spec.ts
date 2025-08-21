import { FormControl } from '@angular/forms';
import { validateEddystoneUrl } from '../helpers/eddystone-url.helper';
import { eddystoneUrlValidator } from './eddystone-encoded-url.validator';

jest.mock('../helpers/eddystone-url.helper', () => ({
  validateEddystoneUrl: jest.fn()
}));

describe('eddystoneUrlValidator', () => {
  let validator: ReturnType<typeof eddystoneUrlValidator>;
  let mockValidate: jest.MockedFunction<typeof validateEddystoneUrl>;

  beforeEach(() => {
    validator = eddystoneUrlValidator();
    mockValidate = validateEddystoneUrl as jest.MockedFunction<typeof validateEddystoneUrl>;
    jest.clearAllMocks();
  });

  it('returns null for null, undefined, or empty string', () => {
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl(undefined))).toBeNull();
    expect(validator(new FormControl(''))).toBeNull();
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('returns null for valid eddystone URL', () => {
    mockValidate.mockReturnValue({ valid: true, encodedLength: 10, error: '' });
    const url = 'https://foo.com';
    expect(validator(new FormControl(url))).toBeNull();
    expect(mockValidate).toHaveBeenCalledWith(url);
  });

  it('returns error object for invalid eddystone URL', () => {
    mockValidate.mockReturnValue({ valid: false, encodedLength: 25, error: 'too long' });
    const url = 'https://very-long-url.com';
    expect(validator(new FormControl(url))).toEqual({
      eddystoneUrl: {
        value: url,
        encodedLength: 25,
        maxLength: 18,
        error: 'too long'
      }
    });
    expect(mockValidate).toHaveBeenCalledWith(url);
  });

  it('handles malformed URLs', () => {
    mockValidate.mockReturnValue({ valid: false, encodedLength: 0, error: 'bad format' });
    const url = 'not-a-url';
    expect(validator(new FormControl(url))).toEqual({
      eddystoneUrl: {
        value: url,
        encodedLength: 0,
        maxLength: 18,
        error: 'bad format'
      }
    });
    expect(mockValidate).toHaveBeenCalledWith(url);
  });

  it('handles whitespace-only strings', () => {
    mockValidate.mockReturnValue({ valid: false, encodedLength: 0, error: 'bad format' });
    expect(validator(new FormControl('   '))).toEqual({
      eddystoneUrl: {
        value: '   ',
        encodedLength: 0,
        maxLength: 18,
        error: 'bad format'
      }
    });
    expect(mockValidate).toHaveBeenCalledWith('   ');
  });

  it('returns null for URL at exact limit', () => {
    mockValidate.mockReturnValue({ valid: true, encodedLength: 18, error: '' });
    const url = 'https://ex.co';
    expect(validator(new FormControl(url))).toBeNull();
    expect(mockValidate).toHaveBeenCalledWith(url);
  });

  it('returns error for URL just over limit', () => {
    mockValidate.mockReturnValue({ valid: false, encodedLength: 19, error: 'too long' });
    const url = 'https://example.co';
    expect(validator(new FormControl(url))).toEqual({
      eddystoneUrl: {
        value: url,
        encodedLength: 19,
        maxLength: 18,
        error: 'too long'
      }
    });
    expect(mockValidate).toHaveBeenCalledWith(url);
  });

  it('returns a new validator function each time', () => {
    expect(eddystoneUrlValidator()).not.toBe(eddystoneUrlValidator());
  });
});