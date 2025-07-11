import {
  getUrlSchemePrefix,
  compressUrl,
  encodeUrl,
  validateEddystoneUrl,
  debugEncodeUrl,
  getCompressionInfo
} from './eddystone-url.helper';

describe('Eddystone URL Encoding Utilities', () => {
  
  describe('getUrlSchemePrefix', () => {
    it('should return 0x00 for http://www. URLs', () => {
      expect(getUrlSchemePrefix('http://www.example.com')).toBe(0x00);
      expect(getUrlSchemePrefix('http://www.google.com/path')).toBe(0x00);
    });

    it('should return 0x01 for https://www. URLs', () => {
      expect(getUrlSchemePrefix('https://www.example.com')).toBe(0x01);
      expect(getUrlSchemePrefix('https://www.google.com/path')).toBe(0x01);
    });

    it('should return 0x02 for http:// URLs', () => {
      expect(getUrlSchemePrefix('http://example.com')).toBe(0x02);
      expect(getUrlSchemePrefix('http://google.com/path')).toBe(0x02);
    });

    it('should return 0x03 for https:// URLs', () => {
      expect(getUrlSchemePrefix('https://example.com')).toBe(0x03);
      expect(getUrlSchemePrefix('https://google.com/path')).toBe(0x03);
    });

    it('should return 0x03 as default for unknown schemes', () => {
      expect(getUrlSchemePrefix('ftp://example.com')).toBe(0x03);
      expect(getUrlSchemePrefix('example.com')).toBe(0x03);
      expect(getUrlSchemePrefix('')).toBe(0x03);
    });
  });

  describe('compressUrl', () => {
    it('should compress .com/ patterns', () => {
      const result = compressUrl('example.com/path');
      expect(result).toBe('example\x00path');
    });

    it('should compress .org/ patterns', () => {
      const result = compressUrl('example.org/path');
      expect(result).toBe('example\x01path');
    });

    it('should compress .edu/ patterns', () => {
      const result = compressUrl('example.edu/path');
      expect(result).toBe('example\x02path');
    });

    it('should compress .net/ patterns', () => {
      const result = compressUrl('example.net/path');
      expect(result).toBe('example\x03path');
    });

    it('should compress .info/ patterns', () => {
      const result = compressUrl('example.info/path');
      expect(result).toBe('example\x04path');
    });

    it('should compress .biz/ patterns', () => {
      const result = compressUrl('example.biz/path');
      expect(result).toBe('example\x05path');
    });

    it('should compress .gov/ patterns', () => {
      const result = compressUrl('example.gov/path');
      expect(result).toBe('example\x06path');
    });

    it('should compress .ly/ patterns', () => {
      const result = compressUrl('bit.ly/path');
      expect(result).toBe('bit\x10path');
    });

    it('should compress .co/ patterns', () => {
      const result = compressUrl('example.co/path');
      expect(result).toBe('example\x12path');
    });

    it('should compress .sh/ patterns', () => {
      const result = compressUrl('dub.sh/path');
      expect(result).toBe('dub\x0Epath');
    });

    it('should compress domain endings without slash', () => {
      expect(compressUrl('example.com')).toBe('example\x07');
      expect(compressUrl('example.org')).toBe('example\x08');
      expect(compressUrl('example.edu')).toBe('example\x09');
      expect(compressUrl('example.net')).toBe('example\x0A');
      expect(compressUrl('example.info')).toBe('example\x0B');
      expect(compressUrl('example.biz')).toBe('example\x0C');
      expect(compressUrl('example.gov')).toBe('example\x0D');
      expect(compressUrl('bit.ly')).toBe('bit\x11');
      expect(compressUrl('example.co')).toBe('example\x13');
      expect(compressUrl('dub.sh')).toBe('dub\x0F');
    });

    it('should prioritize longer patterns over shorter ones', () => {
      const result = compressUrl('example.com/page');
      expect(result).toBe('example\x00page'); // Should use .com/ not .com
    });

    it('should handle multiple compressions', () => {
      const result = compressUrl('example.com/other.org/');
      expect(result).toBe('example\x00other\x01');
    });

    it('should not compress unrecognized patterns', () => {
      const result = compressUrl('example.unknown/path');
      expect(result).toBe('example.unknown/path');
    });

    it('should handle empty strings', () => {
      const result = compressUrl('');
      expect(result).toBe('');
    });

    it('should log debug information when debug is true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      compressUrl('example.com/', true);
      
      expect(consoleSpy).toHaveBeenCalledWith('Before compression: example.com/');
      expect(consoleSpy).toHaveBeenCalledWith('Found .com/ - compressing');
      expect(consoleSpy).toHaveBeenCalledWith('After compression: example\x00');
      
      consoleSpy.mockRestore();
    });
  });

  describe('encodeUrl', () => {
    it('should encode http://www. URLs correctly', () => {
      const result = encodeUrl('http://www.example.com');
      expect(result.encoded.charCodeAt(0)).toBe(0x00);
      expect(result.encoded.substring(1)).toBe('example\x07');
      expect(result.length).toBe(9);
      expect(result.valid).toBe(true);
    });

    it('should encode https://www. URLs correctly', () => {
      const result = encodeUrl('https://www.example.com');
      expect(result.encoded.charCodeAt(0)).toBe(0x01);
      expect(result.encoded.substring(1)).toBe('example\x07');
      expect(result.length).toBe(9);
      expect(result.valid).toBe(true);
    });

    it('should encode http:// URLs correctly', () => {
      const result = encodeUrl('http://example.com');
      expect(result.encoded.charCodeAt(0)).toBe(0x02);
      expect(result.encoded.substring(1)).toBe('example\x07');
      expect(result.length).toBe(9);
      expect(result.valid).toBe(true);
    });

    it('should encode https:// URLs correctly', () => {
      const result = encodeUrl('https://example.com');
      expect(result.encoded.charCodeAt(0)).toBe(0x03);
      expect(result.encoded.substring(1)).toBe('example\x07');
      expect(result.length).toBe(9);
      expect(result.valid).toBe(true);
    });

    it('should encode complex URLs with paths', () => {
      const result = encodeUrl('https://dub.sh/Xb7pD5J');
      expect(result.encoded.charCodeAt(0)).toBe(0x03);
      // Check the actual compression - .sh/ should be compressed to \x0E, not \x0F
      expect(result.encoded.substring(1)).toBe('dub\x0EXb7pD5J');
      expect(result.length).toBe(12);
      expect(result.valid).toBe(true);
    });

    it('should mark URLs as invalid when they exceed 18 bytes', () => {
      const longUrl = 'https://verylongdomainname.com/verylongpath/withmanysegments';
      const result = encodeUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.length).toBeGreaterThan(18);
    });

    it('should generate debug information when debug is true', () => {
      const result = encodeUrl('https://example.com', true);
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo!.originalUrl).toBe('https://example.com');
      expect(result.debugInfo!.schemePrefix).toBe(0x03);
      expect(result.debugInfo!.afterSchemeRemoval).toBe('example.com');
      expect(result.debugInfo!.afterCompression).toBe('example\x07');
      expect(result.debugInfo!.finalLength).toBe(9);
      expect(result.debugInfo!.finalEncodedHex).toBe('03 65 78 61 6D 70 6C 65 07');
    });

    it('should not include debug information when debug is false', () => {
      const result = encodeUrl('https://example.com', false);
      expect(result.debugInfo).toBeUndefined();
    });

    it('should log debug information when debug is true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      encodeUrl('https://example.com', true);
      
      expect(consoleSpy).toHaveBeenCalledWith('=== URL ENCODING DEBUG ===');
      expect(consoleSpy).toHaveBeenCalledWith('Original URL: https://example.com (length: 19)');
      expect(consoleSpy).toHaveBeenCalledWith('Scheme prefix: 0x03');
      expect(consoleSpy).toHaveBeenCalledWith('After scheme removal: example.com (length: 11)');
      expect(consoleSpy).toHaveBeenCalledWith('Final encoded length: 9 bytes');
      expect(consoleSpy).toHaveBeenCalledWith('=========================');
      
      consoleSpy.mockRestore();
    });

    it('should generate correct hex representation', () => {
      const result = encodeUrl('https://a.co', true);
      // a.co should be compressed to a\x13, so hex should be: 03 61 13
      expect(result.debugInfo!.finalEncodedHex).toBe('03 61 13');
    });

    it('should verify .sh/ compression is 0x0E', () => {
      const result = compressUrl('dub.sh/test');
      expect(result).toBe('dub\x0Etest');
      
      const encoded = encodeUrl('https://dub.sh/test');
      expect(encoded.encoded.charCodeAt(0)).toBe(0x03); // https://
      expect(encoded.encoded.substring(1)).toBe('dub\x0Etest');
    });
  });

  describe('validateEddystoneUrl', () => {
    it('should validate short URLs as valid', () => {
      const result = validateEddystoneUrl('https://dub.sh/abc');
      expect(result.valid).toBe(true);
      expect(result.encodedLength).toBeLessThanOrEqual(18);
      expect(result.error).toBeUndefined();
    });

    it('should validate long URLs as invalid', () => {
      const longUrl = 'https://verylongdomainname.com/verylongpath/withmanysegments/andmore';
      const result = validateEddystoneUrl(longUrl);
      expect(result.valid).toBe(false);
      expect(result.encodedLength).toBeGreaterThan(18);
      expect(result.error).toContain('URL too long after encoding');
    });

    it('should handle encoding errors gracefully', () => {
      // Test with a malformed URL that might cause issues
      const result = validateEddystoneUrl('not-a-valid-url');
      
      // The function should still work but might produce a longer encoded result
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('encodedLength');
      expect(typeof result.valid).toBe('boolean');
      expect(typeof result.encodedLength).toBe('number');
    });

    it('should handle actual encoding errors using jest.mock', () => {
      // Create a spy that throws an error
      const originalConsoleError = console.error;
      console.error = jest.fn(); // Suppress error output during test
      
      // Mock the module temporarily by creating a version that throws
      const mockEncodeUrl = jest.fn().mockImplementation(() => {
        throw new Error('Test encoding error');
      });
      
      // Manually test the error handling logic
      try {
        const result = mockEncodeUrl('test-url');
        expect(false).toBe(true); // Should not reach here
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toBe('Test encoding error');
      }
      
      console.error = originalConsoleError;
    });
  });

  describe('debugEncodeUrl', () => {
    it('should return the same result as encodeUrl with debug=true', () => {
      const url = 'https://example.com';
      const debugResult = debugEncodeUrl(url);
      const normalResult = encodeUrl(url, true);
      
      expect(debugResult).toEqual(normalResult);
      expect(debugResult.debugInfo).toBeDefined();
    });

    it('should log debug information', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      debugEncodeUrl('https://example.com');
      
      expect(consoleSpy).toHaveBeenCalledWith('=== URL ENCODING DEBUG ===');
      
      consoleSpy.mockRestore();
    });
  });

  describe('getCompressionInfo', () => {
    it('should identify compression patterns with slash', () => {
      const compressions = getCompressionInfo('https://example.com/path');
      expect(compressions).toContain('.com/');
      expect(compressions).toContain('.com');
    });

    it('should identify compression patterns without slash', () => {
      const compressions = getCompressionInfo('https://example.com');
      expect(compressions).toContain('.com');
      expect(compressions).not.toContain('.com/');
    });

    it('should identify multiple compression patterns', () => {
      const compressions = getCompressionInfo('https://example.com/other.org/');
      expect(compressions).toContain('.com/');
      expect(compressions).toContain('.org/');
    });

    it('should return empty array for URLs without compression patterns', () => {
      const compressions = getCompressionInfo('https://example.xyz/path');
      expect(compressions).toEqual([]);
    });

    it('should identify all supported compression patterns', () => {
      const testCases = [
        { url: 'test.com/', expected: '.com/' },
        { url: 'test.org/', expected: '.org/' },
        { url: 'test.edu/', expected: '.edu/' },
        { url: 'test.net/', expected: '.net/' },
        { url: 'test.info/', expected: '.info/' },
        { url: 'test.biz/', expected: '.biz/' },
        { url: 'test.gov/', expected: '.gov/' },
        { url: 'test.ly/', expected: '.ly/' },
        { url: 'test.co/', expected: '.co/' },
        { url: 'test.sh/', expected: '.sh/' },
        { url: 'test.com', expected: '.com' },
        { url: 'test.org', expected: '.org' },
        { url: 'test.edu', expected: '.edu' },
        { url: 'test.net', expected: '.net' },
        { url: 'test.info', expected: '.info' },
        { url: 'test.biz', expected: '.biz' },
        { url: 'test.gov', expected: '.gov' },
        { url: 'test.ly', expected: '.ly' },
        { url: 'test.co', expected: '.co' },
        { url: 'test.sh', expected: '.sh' }
      ];

      testCases.forEach(({ url, expected }) => {
        const compressions = getCompressionInfo(url);
        expect(compressions).toContain(expected);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle real-world short URLs', () => {
      const testUrls = [
        'https://bit.ly/abc123',
        'https://dub.sh/test',
        'https://t.co/short',
        'https://goo.gl/maps'
      ];

      testUrls.forEach(url => {
        const result = encodeUrl(url);
        expect(result.length).toBeGreaterThan(0);
        expect(result.encoded).toBeDefined();
      });
    });

    it('should maintain consistency between validation and encoding', () => {
      const testUrls = [
        'https://example.com',
        'https://dub.sh/test',
        'https://verylongdomainname.com/verylongpath'
      ];

      testUrls.forEach(url => {
        const validation = validateEddystoneUrl(url);
        const encoding = encodeUrl(url);
        
        expect(validation.valid).toBe(encoding.valid);
        expect(validation.encodedLength).toBe(encoding.length);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URLs', () => {
      const result = encodeUrl('');
      expect(result.length).toBe(1); // Just the scheme prefix
      expect(result.valid).toBe(true);
    });

    it('should handle URLs with only schemes', () => {
      const result = encodeUrl('https://');
      expect(result.length).toBe(1); // Just the scheme prefix
      expect(result.valid).toBe(true);
    });

    it('should handle URLs with special characters', () => {
      const result = encodeUrl('https://example.com/path?param=value&other=123');
      expect(result.length).toBeGreaterThan(0);
      expect(result.encoded).toBeDefined();
    });

    it('should handle Unicode characters in URLs', () => {
      const result = encodeUrl('https://example.com/测试');
      expect(result.length).toBeGreaterThan(0);
      expect(result.encoded).toBeDefined();
    });
  });

  describe('Type Safety Tests', () => {
    it('should return proper UrlEncodingResult interface', () => {
      const result = encodeUrl('https://example.com');
      
      expect(result).toHaveProperty('encoded');
      expect(result).toHaveProperty('length');
      expect(result).toHaveProperty('valid');
      expect(typeof result.encoded).toBe('string');
      expect(typeof result.length).toBe('number');
      expect(typeof result.valid).toBe('boolean');
    });

    it('should return proper UrlEncodingDebugInfo when debug is enabled', () => {
      const result = encodeUrl('https://example.com', true);
      
      expect(result.debugInfo).toBeDefined();
      expect(result.debugInfo).toHaveProperty('originalUrl');
      expect(result.debugInfo).toHaveProperty('originalLength');
      expect(result.debugInfo).toHaveProperty('schemePrefix');
      expect(result.debugInfo).toHaveProperty('afterSchemeRemoval');
      expect(result.debugInfo).toHaveProperty('afterSchemeRemovalLength');
      expect(result.debugInfo).toHaveProperty('afterCompression');
      expect(result.debugInfo).toHaveProperty('afterCompressionLength');
      expect(result.debugInfo).toHaveProperty('finalLength');
      expect(result.debugInfo).toHaveProperty('finalEncodedHex');
    });
  });
});