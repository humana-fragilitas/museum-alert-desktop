import { TestBed } from '@angular/core/testing';
import { FormatDistancePipe } from './format-distance.pipe';

describe('FormatDistancePipe', () => {
  let pipe: FormatDistancePipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FormatDistancePipe] });
    pipe = TestBed.inject(FormatDistancePipe);
  });

  it('should be created', () => {
    expect(pipe).toBeInstanceOf(FormatDistancePipe);
  });

  describe('transform', () => {
    it('returns empty string for null, undefined, NaN, or non-numeric', () => {
      expect(pipe.transform(null as any)).toBe('');
      expect(pipe.transform(undefined as any)).toBe('');
      expect(pipe.transform(NaN)).toBe('');
      expect(pipe.transform('foo' as any)).toBe('');
    });

    it('formats < 100 as centimeters', () => {
      expect(pipe.transform(0)).toBe('0 cm');
      expect(pipe.transform(1)).toBe('1 cm');
      expect(pipe.transform(99)).toBe('99 cm');
      expect(pipe.transform(50.5)).toBe('50.5 cm');
    });

    it('formats exactly 100 as 1.00 meter', () => {
      expect(pipe.transform(100)).toBe('1.00 meter');
    });

    it('formats > 100 as meters (plural)', () => {
      expect(pipe.transform(101)).toBe('1.01 meters');
      expect(pipe.transform(150)).toBe('1.50 meters');
      expect(pipe.transform(200)).toBe('2.00 meters');
      expect(pipe.transform(12345)).toBe('123.45 meters');
    });

    it('handles decimals and rounding', () => {
      expect(pipe.transform(150.75)).toBe('1.51 meters');
      expect(pipe.transform(250.99)).toBe('2.51 meters');
    });

    it('handles negative values as centimeters', () => {
      expect(pipe.transform(-50)).toBe('-50 cm');
      expect(pipe.transform(-150)).toBe('-150 cm');
    });

    it('handles zero', () => {
      expect(pipe.transform(0)).toBe('0 cm');
    });

    it('handles very large and very small numbers', () => {
      expect(pipe.transform(999999)).toBe('9999.99 meters');
      expect(pipe.transform(0.1)).toBe('0.1 cm');
      expect(pipe.transform(0.01)).toBe('0.01 cm');
    });
  });
});