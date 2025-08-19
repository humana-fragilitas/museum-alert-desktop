import {
  getUrlSchemePrefix,
  compressUrl,
  encodeUrl,
  validateEddystoneUrl,
  debugEncodeUrl,
  getCompressionInfo
} from './eddystone-url.helper';

describe('eddystone-url.helper', () => {
  describe('getUrlSchemePrefix', () => {
    it('returns correct prefix for all supported schemes', () => {
      expect(getUrlSchemePrefix('http://www.example.com')).toBe(0x00);
      expect(getUrlSchemePrefix('https://www.example.com')).toBe(0x01);
      expect(getUrlSchemePrefix('http://example.com')).toBe(0x02);
      expect(getUrlSchemePrefix('https://example.com')).toBe(0x03);
      expect(getUrlSchemePrefix('ftp://example.com')).toBe(0x03);
      expect(getUrlSchemePrefix('example.com')).toBe(0x03);
      expect(getUrlSchemePrefix('')).toBe(0x03);
    });
  });

  describe('compressUrl', () => {
    it('compresses all supported domain endings with and without slash', () => {
      expect(compressUrl('foo.com/')).toBe('foo\x00');
      expect(compressUrl('foo.org/')).toBe('foo\x01');
      expect(compressUrl('foo.edu/')).toBe('foo\x02');
      expect(compressUrl('foo.net/')).toBe('foo\x03');
      expect(compressUrl('foo.info/')).toBe('foo\x04');
      expect(compressUrl('foo.biz/')).toBe('foo\x05');
      expect(compressUrl('foo.gov/')).toBe('foo\x06');
      expect(compressUrl('foo.ly/')).toBe('foo\x10');
      expect(compressUrl('foo.co/')).toBe('foo\x12');
      expect(compressUrl('foo.sh/')).toBe('foo\x0E');
      expect(compressUrl('foo.com')).toBe('foo\x07');
      expect(compressUrl('foo.org')).toBe('foo\x08');
      expect(compressUrl('foo.edu')).toBe('foo\x09');
      expect(compressUrl('foo.net')).toBe('foo\x0A');
      expect(compressUrl('foo.info')).toBe('foo\x0B');
      expect(compressUrl('foo.biz')).toBe('foo\x0C');
      expect(compressUrl('foo.gov')).toBe('foo\x0D');
      expect(compressUrl('foo.ly')).toBe('foo\x11');
      expect(compressUrl('foo.co')).toBe('foo\x13');
      expect(compressUrl('foo.sh')).toBe('foo\x0F');
    });
    it('prioritizes longer patterns', () => {
      expect(compressUrl('foo.com/page')).toBe('foo\x00page');
    });
    it('handles multiple compressions', () => {
      expect(compressUrl('foo.com/bar.org/')).toBe('foo\x00bar\x01');
    });
    it('returns unchanged for unknown patterns', () => {
      expect(compressUrl('foo.xyz/')).toBe('foo.xyz/');
    });
    it('handles empty string', () => {
      expect(compressUrl('')).toBe('');
    });
    it('logs debug info if debug=true', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      compressUrl('foo.com/', true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('encodeUrl', () => {
    it('encodes all supported schemes and compressions', () => {
      const schemes = [
        { url: 'http://www.example.com', prefix: 0x00 },
        { url: 'https://www.example.com', prefix: 0x01 },
        { url: 'http://example.com', prefix: 0x02 },
        { url: 'https://example.com', prefix: 0x03 }
      ];
      for (const { url, prefix } of schemes) {
        const result = encodeUrl(url);
        expect(result.encoded.charCodeAt(0)).toBe(prefix);
        expect(result.encoded.substring(1)).toBe('example\x07');
        expect(result.length).toBe(9); // 8 chars + 1 prefix
        expect(result.valid).toBe(true);
      }
    });
    it('encodes .sh/ as 0x0E', () => {
      const result = encodeUrl('https://dub.sh/test');
      expect(result.encoded.charCodeAt(0)).toBe(0x03);
      expect(result.encoded.substring(1)).toBe('dub\x0Etest');
    });
    it('marks URLs as invalid if >18 bytes', () => {
      const longUrl = 'https://averyveryverylongdomain.com/averylongpath';
      const result = encodeUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.length).toBeGreaterThan(18);
    });
    it('returns debugInfo if debug=true', () => {
      const result = encodeUrl('https://example.com', true);
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo!.originalUrl).toBe('https://example.com');
      expect(result.debugInfo!.schemePrefix).toBe(0x03);
      expect(result.debugInfo!.afterSchemeRemoval).toBe('example.com');
      expect(result.debugInfo!.afterCompression).toBe('example\x07');
      expect(result.debugInfo!.finalLength).toBe(9);
      expect(typeof result.debugInfo!.finalEncodedHex).toBe('string');
    });
    it('does not return debugInfo if debug=false', () => {
      const result = encodeUrl('https://foo.com', false);
      expect(result.debugInfo).toBeUndefined();
    });
    it('logs debug info if debug=true', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      encodeUrl('https://foo.com', true);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
    it('handles empty and scheme-only URLs', () => {
      expect(encodeUrl('').length).toBe(1);
      expect(encodeUrl('https://').length).toBe(1);
    });
    it('handles unicode and special characters', () => {
      expect(encodeUrl('https://foo.com/测试').length).toBeGreaterThan(1);
      expect(encodeUrl('https://foo.com/path?x=1&y=2').length).toBeGreaterThan(1);
    });
  });

  describe('validateEddystoneUrl', () => {
    it('validates short URLs as valid', () => {
      const result = validateEddystoneUrl('https://dub.sh/abc');
      expect(result.valid).toBe(true);
      expect(result.encodedLength).toBeLessThanOrEqual(18);
      expect(result.error).toBeUndefined();
    });
    it('invalidates long URLs', () => {
      const longUrl = 'https://averyveryverylongdomain.com/averylongpath';
      const result = validateEddystoneUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.encodedLength).toBeGreaterThan(18);
      expect(result.error).toContain('URL too long after encoding');
    });
    it('handles malformed URLs gracefully', () => {
      const result = validateEddystoneUrl('not-a-valid-url');
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.encodedLength).toBe('number');
    });
  });

  describe('debugEncodeUrl', () => {
    it('returns same as encodeUrl with debug=true', () => {
      const url = 'https://foo.com';
      expect(debugEncodeUrl(url)).toEqual(encodeUrl(url, true));
    });
    it('logs debug info', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation();
      debugEncodeUrl('https://foo.com');
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe('getCompressionInfo', () => {
    it('identifies all supported patterns', () => {
      const patterns = [
        '.com/', '.org/', '.edu/', '.net/', '.info/', '.biz/', '.gov/', '.ly/', '.co/', '.sh/',
        '.com', '.org', '.edu', '.net', '.info', '.biz', '.gov', '.ly', '.co', '.sh'
      ];
      for (const pattern of patterns) {
        expect(getCompressionInfo('foo' + pattern)).toContain(pattern);
      }
    });
    it('returns empty array for no matches', () => {
      expect(getCompressionInfo('foo.xyz/')).toEqual([]);
    });
    it('finds multiple patterns', () => {
      expect(getCompressionInfo('foo.com/bar.org/')).toEqual(expect.arrayContaining(['.com/', '.org/']));
    });
  });

  describe('integration', () => {
    it('encodes and validates real-world short URLs', () => {
      const urls = [
        'https://bit.ly/abc123',
        'https://dub.sh/test',
        'https://t.co/short',
        'https://goo.gl/maps'
      ];
      for (const url of urls) {
        const enc = encodeUrl(url);
        expect(enc.length).toBeGreaterThan(0);
        expect(enc.encoded).toBeDefined();
        expect(validateEddystoneUrl(url).valid).toBe(enc.valid);
      }
    });
    it('validation and encoding are consistent', () => {
      const urls = [
        'https://foo.com',
        'https://dub.sh/test',
        'https://averyveryverylongdomain.com/averylongpath'
      ];
      for (const url of urls) {
        const v = validateEddystoneUrl(url);
        const e = encodeUrl(url);
        expect(v.valid).toBe(e.valid);
        expect(v.encodedLength).toBe(e.length);
      }
    });
  });

  describe('type safety', () => {
    it('encodeUrl returns UrlEncodingResult', () => {
      const r = encodeUrl('https://foo.com');
      expect(r).toHaveProperty('encoded');
      expect(r).toHaveProperty('length');
      expect(r).toHaveProperty('valid');
      expect(typeof r.encoded).toBe('string');
      expect(typeof r.length).toBe('number');
      expect(typeof r.valid).toBe('boolean');
    });
    it('encodeUrl with debug returns UrlEncodingDebugInfo', () => {
      const r = encodeUrl('https://foo.com', true);
      expect(r.debugInfo).toBeDefined();
      expect(r.debugInfo).toHaveProperty('originalUrl');
      expect(r.debugInfo).toHaveProperty('originalLength');
      expect(r.debugInfo).toHaveProperty('schemePrefix');
      expect(r.debugInfo).toHaveProperty('afterSchemeRemoval');
      expect(r.debugInfo).toHaveProperty('afterSchemeRemovalLength');
      expect(r.debugInfo).toHaveProperty('afterCompression');
      expect(r.debugInfo).toHaveProperty('afterCompressionLength');
      expect(r.debugInfo).toHaveProperty('finalLength');
      expect(r.debugInfo).toHaveProperty('finalEncodedHex');
    });
  });
});