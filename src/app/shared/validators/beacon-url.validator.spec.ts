import { FormControl } from '@angular/forms';

import { beaconUrlValidator } from './beacon-url.validator';
import { urlValidator } from './url.validator';
import { firstLevelDomainValidator } from './first-level-domain.validator';
import { eddystoneUrlValidator } from './eddystone-encoded-url.validator';


jest.mock('./url.validator');
jest.mock('./first-level-domain.validator');
jest.mock('./eddystone-encoded-url.validator');

describe('beaconUrlValidator', () => {
  let validator: ReturnType<typeof beaconUrlValidator>;
  let mockUrlValidator: jest.MockedFunction<typeof urlValidator>;
  let mockDomainValidator: jest.MockedFunction<typeof firstLevelDomainValidator>;
  let mockEddystoneValidator: jest.MockedFunction<typeof eddystoneUrlValidator>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUrlValidator = urlValidator as jest.MockedFunction<typeof urlValidator>;
    mockDomainValidator = firstLevelDomainValidator as jest.MockedFunction<typeof firstLevelDomainValidator>;
    mockEddystoneValidator = eddystoneUrlValidator as jest.MockedFunction<typeof eddystoneUrlValidator>;
    mockUrlValidator.mockReturnValue(() => null);
    mockDomainValidator.mockReturnValue(() => null);
    mockEddystoneValidator.mockReturnValue(() => null);
    validator = beaconUrlValidator();
  });

  it('returns null for empty, null, or undefined', () => {
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl(undefined))).toBeNull();
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('does not call validators for empty value', () => {
    validator(new FormControl(''));
    expect(mockUrlValidator).not.toHaveBeenCalled();
    expect(mockDomainValidator).not.toHaveBeenCalled();
    expect(mockEddystoneValidator).not.toHaveBeenCalled();
  });

  it('returns url error if urlValidator fails', () => {
    const urlError = { invalidUrl: true };
    mockUrlValidator.mockReturnValue(() => urlError);
    const control = new FormControl('bad-url');
    expect(validator(control)).toBe(urlError);
    expect(mockUrlValidator).toHaveBeenCalled();
    expect(mockDomainValidator).not.toHaveBeenCalled();
    expect(mockEddystoneValidator).not.toHaveBeenCalled();
  });

  it('returns domain error if domainValidator fails', () => {
    mockUrlValidator.mockReturnValue(() => null);
    const domainError = { invalidDomain: true };
    mockDomainValidator.mockReturnValue(() => domainError);
    const control = new FormControl('https://foo.xyz');
    expect(validator(control)).toBe(domainError);
    expect(mockUrlValidator).toHaveBeenCalled();
    expect(mockDomainValidator).toHaveBeenCalled();
    expect(mockEddystoneValidator).not.toHaveBeenCalled();
  });

  it('returns eddystone error if eddystoneValidator fails', () => {
    mockUrlValidator.mockReturnValue(() => null);
    mockDomainValidator.mockReturnValue(() => null);
    const eddystoneError = { invalidEddystoneUrl: true };
    mockEddystoneValidator.mockReturnValue(() => eddystoneError);
    const control = new FormControl('https://foo.com');
    expect(validator(control)).toBe(eddystoneError);
    expect(mockUrlValidator).toHaveBeenCalled();
    expect(mockDomainValidator).toHaveBeenCalled();
    expect(mockEddystoneValidator).toHaveBeenCalled();
  });

  it('returns null if all validators pass', () => {
    mockUrlValidator.mockReturnValue(() => null);
    mockDomainValidator.mockReturnValue(() => null);
    mockEddystoneValidator.mockReturnValue(() => null);
    const control = new FormControl('https://foo.com');
    expect(validator(control)).toBeNull();
    expect(mockUrlValidator).toHaveBeenCalled();
    expect(mockDomainValidator).toHaveBeenCalled();
    expect(mockEddystoneValidator).toHaveBeenCalled();
  });

  it('calls validators in order: url, domain, eddystone', () => {
    const order: string[] = [];
    mockUrlValidator.mockReturnValue(() => { order.push('url'); return null; });
    mockDomainValidator.mockReturnValue(() => { order.push('domain'); return null; });
    mockEddystoneValidator.mockReturnValue(() => { order.push('eddystone'); return null; });
    validator(new FormControl('https://foo.com'));
    expect(order).toEqual(['url', 'domain', 'eddystone']);
  });

  it('returns a new validator function each time', () => {
    expect(beaconUrlValidator()).not.toBe(beaconUrlValidator());
  });

  it('handles whitespace-only as non-empty', () => {
    validator(new FormControl('   '));
    expect(mockUrlValidator).toHaveBeenCalled();
  });

  it('handles non-string values', () => {
    validator(new FormControl(123));
    expect(mockUrlValidator).toHaveBeenCalled();
  });

  it('handles boolean false and zero as empty', () => {
    expect(validator(new FormControl(false))).toBeNull();
    expect(validator(new FormControl(0))).toBeNull();
    expect(mockUrlValidator).not.toHaveBeenCalled();
  });

  it('preserves complex error objects from all validators', () => {
    const urlErr = { invalidUrl: true, msg: 'bad' };
    const domErr = { invalidDomain: true, msg: 'bad' };
    const eddErr = { invalidEddystoneUrl: true, msg: 'bad' };
    mockUrlValidator.mockReturnValue(() => urlErr);
    expect(validator(new FormControl('bad'))).toBe(urlErr);
    mockUrlValidator.mockReturnValue(() => null);
    mockDomainValidator.mockReturnValue(() => domErr);
    expect(validator(new FormControl('bad'))).toBe(domErr);
    mockDomainValidator.mockReturnValue(() => null);
    mockEddystoneValidator.mockReturnValue(() => eddErr);
    expect(validator(new FormControl('bad'))).toBe(eddErr);
  });
});