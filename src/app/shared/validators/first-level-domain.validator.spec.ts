import { FormControl } from '@angular/forms';

import { firstLevelDomainValidator } from './first-level-domain.validator';


describe('firstLevelDomainValidator', () => {
  let validator: ReturnType<typeof firstLevelDomainValidator>;
  beforeEach(() => { validator = firstLevelDomainValidator(); });

  it('returns null for allowed TLDs (with/without protocol, subdomains, case)', () => {
    const valid = [
      'https://foo.com', 'http://foo.org', 'https://foo.edu', 'http://foo.net',
      'https://foo.info', 'http://foo.biz', 'https://foo.gov', 'http://foo.ly',
      'https://foo.co', 'http://foo.sh', 'foo.com', 'foo.org', 'foo.edu',
      'foo.net', 'foo.info', 'foo.biz', 'foo.gov', 'foo.ly', 'foo.co', 'foo.sh',
      'sub.foo.com', 'sub.sub.foo.org', 'HTTPS://FOO.COM', 'http://sub.foo.ly',
      'foo.com/path', 'foo.com?x=1', 'foo.com#frag', 'foo.com:8080',
      'https://foo.com:8080/path', 'https://foo.com/path?x=1#frag'
    ];
    for (const url of valid) {
      expect(validator(new FormControl(url))).toBeNull();
    }
  });

  it('returns error for disallowed TLDs', () => {
    const invalid = [
      { url: 'https://foo.xyz', tld: '.xyz' },
      { url: 'foo.io', tld: '.io' },
      { url: 'foo.de', tld: '.de' },
      { url: 'foo.uk', tld: '.uk' },
      { url: 'foo.abc', tld: '.abc' }
    ];
    for (const { url, tld } of invalid) {
      const result = validator(new FormControl(url));
      expect(result).not.toBeNull();
      expect(result!.firstLevelDomain.foundDomain).toBe(tld);
      expect(result!.firstLevelDomain.allowedDomains).toContain('.com');
    }
  });

  it('returns error for no TLD or single-part domains', () => {
    expect(validator(new FormControl('localhost'))).not.toBeNull();
    expect(validator(new FormControl('a'))).not.toBeNull();
  });

  it('returns null for empty, null, or undefined', () => {
    expect(validator(new FormControl(''))).toBeNull();
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl(undefined))).toBeNull();
  });

  it('returns error for malformed HTTP/HTTPS URLs', () => {
    const bad = ['http://', 'https://', 'http://[bad'];
    for (const url of bad) {
      const result = validator(new FormControl(url));
      expect(result).not.toBeNull();
      expect(result!.firstLevelDomain.error).toBe('Invalid URL format');
    }
  });

  it('returns error for non-HTTP/HTTPS protocols', () => {
    const protos = [
      'ftp://foo.com', 'mailto:foo@bar.com', 'file://foo.com', 'ssh://foo.com',
      'telnet://foo.com', 'ldap://foo.com', 'news://foo.com', 'gopher://foo.com',
      'wais://foo.com', '://foo.com'
    ];
    for (const url of protos) {
      const result = validator(new FormControl(url));
      expect(result).not.toBeNull();
      expect(result!.firstLevelDomain.error).toBe('Only HTTP and HTTPS URLs are allowed');
    }
  });

  it('returns error for strings without valid TLD', () => {
    const bad = ['not-a-url', 'just-text', 'no-dot-here'];
    for (const url of bad) {
      const result = validator(new FormControl(url));
      expect(result).not.toBeNull();
      expect(result!.firstLevelDomain.allowedDomains).toContain('.com');
    }
  });

  it('handles numbers, booleans, and special chars', () => {
    expect(validator(new FormControl(12345))).not.toBeNull();
    expect(validator(new FormControl(true))).not.toBeNull();
    expect(validator(new FormControl('test-site.com'))).toBeNull();
    expect(validator(new FormControl('test123.com'))).toBeNull();
  });

  it('handles very long and minimum valid domains', () => {
    expect(validator(new FormControl('a.com'))).toBeNull();
    expect(validator(new FormControl('a'.repeat(100) + '.com'))).toBeNull();
  });

  it('returns error object with correct structure', () => {
    const r = validator(new FormControl('foo.xyz'));
    expect(r).toMatchObject({
      firstLevelDomain: {
        value: 'foo.xyz',
        foundDomain: '.xyz',
        allowedDomains: expect.arrayContaining(['.com'])
      }
    });
    const r2 = validator(new FormControl('http://[bad'));
    expect(r2).toMatchObject({
      firstLevelDomain: {
        value: 'http://[bad',
        error: 'Invalid URL format',
        allowedDomains: expect.arrayContaining(['.com'])
      }
    });
  });
});