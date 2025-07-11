import { TestBed } from '@angular/core/testing';
import { FormatDistancePipe } from './format-distance.pipe';

describe('FormatDistancePipe', () => {
  let pipe: FormatDistancePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FormatDistancePipe]
    });
    pipe = TestBed.inject(FormatDistancePipe);
  });

  it('should create', () => {
    expect(pipe).toBeTruthy();
  });

  describe('transform', () => {
    it('should return empty string for null value', () => {
      expect(pipe.transform(null as any)).toBe('');
    });

    it('should return empty string for undefined value', () => {
      expect(pipe.transform(undefined as any)).toBe('');
    });

    it('should return empty string for NaN value', () => {
      expect(pipe.transform(NaN)).toBe('');
    });

    it('should return empty string for non-numeric string', () => {
      expect(pipe.transform('invalid' as any)).toBe('');
    });

    it('should format values less than 100 as centimeters', () => {
      expect(pipe.transform(0)).toBe('0 cm');
      expect(pipe.transform(50)).toBe('50 cm');
      expect(pipe.transform(99)).toBe('99 cm');
    });

    it('should format value 100 as plural meters (boundary case)', () => {
      expect(pipe.transform(100)).toBe('1.00 meters');
    });

    it('should format values between 100 and 200 (exclusive) as singular meter', () => {
      expect(pipe.transform(101)).toBe('1.01 meter');
      expect(pipe.transform(150)).toBe('1.50 meter');
      expect(pipe.transform(199)).toBe('1.99 meter');
    });

    it('should format value 200 as plural meters (boundary case)', () => {
      expect(pipe.transform(200)).toBe('2.00 meters');
    });

    it('should format values greater than 200 as plural meters', () => {
      expect(pipe.transform(250)).toBe('2.50 meters');
      expect(pipe.transform(1000)).toBe('10.00 meters');
      expect(pipe.transform(12345)).toBe('123.45 meters');
    });

    it('should handle decimal input values correctly', () => {
      expect(pipe.transform(50.5)).toBe('50.5 cm');
      expect(pipe.transform(150.75)).toBe('1.51 meter');
      expect(pipe.transform(250.99)).toBe('2.51 meters');
    });

    it('should handle negative values', () => {
      expect(pipe.transform(-50)).toBe('-50 cm');
      expect(pipe.transform(-150)).toBe('-150 cm');
      expect(pipe.transform(-250)).toBe('-250 cm');
    });

    it('should handle zero value', () => {
      expect(pipe.transform(0)).toBe('0 cm');
    });

    it('should handle very large numbers', () => {
      expect(pipe.transform(999999)).toBe('9999.99 meters');
    });

    it('should handle very small positive numbers', () => {
      expect(pipe.transform(0.1)).toBe('0.1 cm');
      expect(pipe.transform(0.01)).toBe('0.01 cm');
    });
  });
});