import { msToHMS } from './milliseconds-to-readable-time.helper';

describe('msToHMS', () => {
  it('should convert milliseconds to hours, minutes, and seconds', () => {
    // Test 1 hour, 30 minutes, 45 seconds
    const result = msToHMS(5445000); // 5445000 ms = 1h 30m 45s
    expect(result.h).toBe(1);
    expect(result.m).toBe(30);
    expect(result.s).toBe(45);
  });

  it('should handle zero milliseconds', () => {
    const result = msToHMS(0);
    expect(result.h).toBe(0);
    expect(result.m).toBe(0);
    expect(result.s).toBe(0);
  });

  it('should handle values less than 1 minute', () => {
    const result = msToHMS(30000); // 30 seconds
    expect(result.h).toBe(0);
    expect(result.m).toBe(0);
    expect(result.s).toBe(30);
  });

  it('should handle values less than 1 hour', () => {
    const result = msToHMS(1800000); // 30 minutes
    expect(result.h).toBe(0);
    expect(result.m).toBe(30);
    expect(result.s).toBe(0);
  });
});