import { FormControl } from '@angular/forms';
import { firstLevelDomainValidator } from './first-level-domain.validator';

describe('firstLevelDomainValidator', () => {
  let validator: ReturnType<typeof firstLevelDomainValidator>;

  beforeEach(() => {
    validator = firstLevelDomainValidator();
  });

  describe('Valid domains', () => {
    const validUrls = [
      'https://example.com',
      'http://test.org',
      'https://university.edu',
      'http://network.net',
      'https://information.info',
      'http://business.biz',
      'https://government.gov',
      'http://short.ly',
      'https://company.co',
      'http://shell.sh',
      'example.com',
      'test.org',
      'subdomain.example.com',
      'https://sub.domain.example.com',
      'http://multiple.sub.domains.test.org'
    ];

    test.each(validUrls)('should return null for valid URL: %s', (url) => {
      const control = new FormControl(url);
      const result = validator(control);
      
      expect(result).toBeNull();
    });
  });

  describe('Invalid domains', () => {
    const invalidTestCases = [
      {
        url: 'https://example.xyz',
        expectedTld: '.xyz'
      },
      {
        url: 'http://test.invalid',
        expectedTld: '.invalid'
      },
      {
        url: 'example.io',
        expectedTld: '.io'
      },
      {
        url: 'https://site.de',
        expectedTld: '.de'
      },
      {
        url: 'subdomain.example.uk',
        expectedTld: '.uk'
      }
    ];

    test.each(invalidTestCases)('should return error for invalid URL: $url', ({ url, expectedTld }) => {
      const control = new FormControl(url);
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
      expect(result!.firstLevelDomain).toMatchObject({
        value: url,
        foundDomain: expectedTld,
        allowedDomains: expect.arrayContaining([
          '.com', '.org', '.edu', '.net', '.info', 
          '.biz', '.gov', '.ly', '.co', '.sh'
        ])
      });
    });
  });

  describe('Edge cases', () => {
    test('should return null for empty string', () => {
      const control = new FormControl('');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should return null for null value', () => {
      const control = new FormControl(null);
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should return null for undefined value', () => {
      const control = new FormControl(undefined);
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should return error for domain without TLD', () => {
      const control = new FormControl('localhost');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
      expect(result!.firstLevelDomain).toMatchObject({
        value: 'localhost',
        allowedDomains: expect.any(Array)
      });
    });

    test('should return error for single character domain', () => {
      const control = new FormControl('a');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
    });

    test('should handle URLs with paths', () => {
      const control = new FormControl('https://example.com/path/to/page');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should handle URLs with query parameters', () => {
      const control = new FormControl('https://example.com?param=value');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should handle URLs with fragments', () => {
      const control = new FormControl('https://example.com#section');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should handle URLs with ports', () => {
      const control = new FormControl('https://example.com:8080');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should handle domains without protocol and with paths', () => {
      const control = new FormControl('example.com/path');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should be case insensitive', () => {
      const control = new FormControl('HTTPS://EXAMPLE.COM');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should handle mixed case invalid domains', () => {
      const control = new FormControl('HTTPS://EXAMPLE.XYZ');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result!.firstLevelDomain.foundDomain).toBe('.xyz');
    });
  });

  describe('Invalid URL formats', () => {
    test('should return error for malformed HTTP URLs', () => {
      const invalidFormats = [
        'http://',
        'https://',
        'http://[invalid-url'
      ];

      invalidFormats.forEach(invalidUrl => {
        const control = new FormControl(invalidUrl);
        const result = validator(control);
        
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('firstLevelDomain');
        expect(result!.firstLevelDomain.error).toBe('Invalid URL format');
      });
    });

    test('should reject FTP protocol', () => {
      const control = new FormControl('ftp://example.com');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
      expect(result!.firstLevelDomain.error).toBe('Only HTTP and HTTPS URLs are allowed');
    });

    test('should reject mailto protocol', () => {
      const control = new FormControl('mailto:test@example.com');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
      expect(result!.firstLevelDomain.error).toBe('Only HTTP and HTTPS URLs are allowed');
    });

    test('should reject file protocol', () => {
      const control = new FormControl('file://example.com');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
      expect(result!.firstLevelDomain.error).toBe('Only HTTP and HTTPS URLs are allowed');
    });

    test('should reject SSH protocol', () => {
      const control = new FormControl('ssh://example.com');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
      expect(result!.firstLevelDomain.error).toBe('Only HTTP and HTTPS URLs are allowed');
    });

    test('should reject telnet protocol', () => {
      const control = new FormControl('telnet://example.com');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
      expect(result!.firstLevelDomain.error).toBe('Only HTTP and HTTPS URLs are allowed');
    });

    test('should reject malformed protocol URLs', () => {
      const control = new FormControl('://example.com');
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
      expect(result!.firstLevelDomain.error).toBe('Only HTTP and HTTPS URLs are allowed');
    });

    test('should return error for strings without valid TLD', () => {
      const invalidDomains = [
        'not-a-url',
        'just-text',
        'no-dot-here'
      ];

      invalidDomains.forEach(invalidDomain => {
        const control = new FormControl(invalidDomain);
        const result = validator(control);
        
        expect(result).not.toBeNull();
        expect(result).toHaveProperty('firstLevelDomain');
        expect(result!.firstLevelDomain).toHaveProperty('allowedDomains');
      });
    });
  });

  describe('Number and special character handling', () => {
    test('should handle numeric input', () => {
      const control = new FormControl(12345);
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
    });

    test('should handle boolean input', () => {
      const control = new FormControl(true);
      const result = validator(control);
      
      expect(result).not.toBeNull();
      expect(result).toHaveProperty('firstLevelDomain');
    });

    test('should handle domains with special characters', () => {
      const control = new FormControl('test-site.com');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should handle domains with numbers', () => {
      const control = new FormControl('test123.com');
      const result = validator(control);
      
      expect(result).toBeNull();
    });
  });

  describe('Boundary conditions', () => {
    test('should handle very long URLs', () => {
      const longSubdomain = 'a'.repeat(100);
      const control = new FormControl(`https://${longSubdomain}.example.com`);
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should handle minimum valid domain', () => {
      const control = new FormControl('a.com');
      const result = validator(control);
      
      expect(result).toBeNull();
    });

    test('should validate all allowed domains', () => {
      const allowedDomains = ['.com', '.org', '.edu', '.net', '.info', '.biz', '.gov', '.ly', '.co', '.sh'];
      
      allowedDomains.forEach(domain => {
        const control = new FormControl(`example${domain}`);
        const result = validator(control);
        
        expect(result).toBeNull();
      });
    });
  });

  describe('Error object structure', () => {
    test('should return properly structured error object', () => {
      const control = new FormControl('example.xyz');
      const result = validator(control);
      
      expect(result).toMatchObject({
        firstLevelDomain: {
          value: 'example.xyz',
          foundDomain: '.xyz',
          allowedDomains: expect.arrayContaining([
            '.com', '.org', '.edu', '.net', '.info', 
            '.biz', '.gov', '.ly', '.co', '.sh'
          ])
        }
      });
    });

    test('should return error object with correct structure for URL format errors', () => {
      const control = new FormControl('http://[invalid');
      const result = validator(control);
      
      expect(result).toMatchObject({
        firstLevelDomain: {
          value: 'http://[invalid',
          error: 'Invalid URL format',
          allowedDomains: expect.arrayContaining([
            '.com', '.org', '.edu', '.net', '.info', 
            '.biz', '.gov', '.ly', '.co', '.sh'
          ])
        }
      });
    });
  });
});