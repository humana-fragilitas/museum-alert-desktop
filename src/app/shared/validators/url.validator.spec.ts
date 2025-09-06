import { FormControl } from '@angular/forms';

import { urlValidator } from './url.validator';


describe('urlValidator', () => {

  let validator: ReturnType<typeof urlValidator>;
  beforeEach(() => { validator = urlValidator(); });

  it('returns null for empty, null, or undefined', () => {
    expect(validator(new FormControl(''))).toBeNull();
    expect(validator(new FormControl(null))).toBeNull();
    expect(validator(new FormControl(undefined))).toBeNull();
  });

  it('returns null for valid http/https URLs', () => {
    const valid = [
      'http://foo.com',
      'https://foo.com',
      'https://foo.com/path',
      'http://foo.com:8080',
      'https://foo.com?query=1',
      'foo.com',
      'foo.com/path',
      'foo.com:8080',
      'foo.com?query=1',
    ];
    for (const url of valid) {
      const result = validator(new FormControl(url));
      expect(result).toBeNull();
    }
  });

  it('returns error for invalid URLs', () => {
    const invalid = [
      'ftp://foo.com',
      'foo',
      'http:/foo.com',
      '://foo.com',
      'http//foo.com',
    ];
    for (const url of invalid) {
      const result = validator(new FormControl(url));
      expect(result).not.toBeNull();
      expect(result && result.url && result.url.value).toBe(url);
    }
  });

  it('returns error for non-string values', () => {
    expect(validator(new FormControl(12345))).not.toBeNull();
    expect(validator(new FormControl(true))).not.toBeNull();
  });

  it('is case insensitive', () => {
    expect(validator(new FormControl('HTTPS://FOO.COM'))).toBeNull();
    expect(validator(new FormControl('HTTP://FOO.COM'))).toBeNull();
  });

  it('handles domains with numbers and special chars', () => {
    expect(validator(new FormControl('test-site.com'))).toBeNull();
    expect(validator(new FormControl('test123.com'))).toBeNull();
  });

  it('returns error object with correct structure', () => {
    const r = validator(new FormControl('bad-url'));
    expect(r).toMatchObject({ url: { value: 'bad-url' } });
  });

});
