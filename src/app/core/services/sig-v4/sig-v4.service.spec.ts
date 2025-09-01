// Move mockDayjs definition above all imports
const mockDayjs: any = Object.assign(
  jest.fn(() => ({
    utc: jest.fn().mockReturnThis(),
    unix: jest.fn().mockReturnThis(),
    add: jest.fn().mockReturnThis(),
    subtract: jest.fn().mockReturnThis(),
    format: jest.fn((formatString: string) => {
      if (formatString === 'YYYYMMDD') return '20250101';
      if (formatString === 'HHmmss') return '123456';
      if (formatString === 'YYYYMMDD[T]HHmmss[Z]') return '20250101T123456Z';
      return '2023-01-01T00:00:00Z';
    }),
    toISOString: jest.fn(() => '2023-01-01T00:00:00Z'),
    isAfter: jest.fn(() => false),
    isBefore: jest.fn(() => false),
    isSame: jest.fn(() => true),
    diff: jest.fn(() => 0)
  })),
  {
    extend: jest.fn(),
    utc: jest.fn(() => mockDayjs())
  }
);

import { AuthSession } from 'aws-amplify/auth';
import * as CryptoJS from 'crypto-js';
import dayjs from 'dayjs';

import { TestBed } from '@angular/core/testing';

import { SigV4Service } from './sig-v4.service';


// Mock environment config
jest.mock('@env/environment', () => ({
  APP_CONFIG: {
    aws: {
      IoTCore: {
        endpoint: 'iot-endpoint.example.com',
        service: 'iotdevicegateway'
      },
      algorithm: 'AWS4-HMAC-SHA256',
      region: 'us-east-1'
    }
  }
}));

// Mock CryptoJS
const mockWordArray = { toString: jest.fn().mockReturnValue('mocked-hash') };
jest.mock('crypto-js', () => ({
  HmacSHA256: jest.fn(() => mockWordArray),
  SHA256: jest.fn(() => mockWordArray),
  enc: { Hex: 'hex' },
  lib: { WordArray: jest.fn() }
}));

jest.mock('dayjs', () => mockDayjs);

describe('SigV4Service', () => {
  let service: SigV4Service;
  let mockSession: AuthSession;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [SigV4Service] });
    service = TestBed.inject(SigV4Service);
    mockSession = {
      credentials: {
        secretAccessKey: 'secret',
        accessKeyId: 'access',
        sessionToken: 'token'
      },
      identityId: 'id-123'
    } as AuthSession;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'dir').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('sign', () => {
    it('calls HmacSHA256 and returns hex string', () => {
      const result = service.sign('key', 'msg');
      expect(CryptoJS.HmacSHA256).toHaveBeenCalledWith('msg', 'key');
      expect(mockWordArray.toString).toHaveBeenCalledWith('hex');
      expect(result).toBe('mocked-hash');
    });
  });

  describe('sha256', () => {
    it('calls SHA256 and returns hex string', () => {
      const result = service.sha256('msg');
      expect(CryptoJS.SHA256).toHaveBeenCalledWith('msg');
      expect(mockWordArray.toString).toHaveBeenCalledWith('hex');
      expect(result).toBe('mocked-hash');
    });
  });

  describe('getSignatureKey', () => {
    it('calls HmacSHA256 4 times in AWS SigV4 order', () => {
      const result = service.getSignatureKey('key', 'date', 'region', 'service');
      expect(CryptoJS.HmacSHA256).toHaveBeenNthCalledWith(1, 'date', 'AWS4key');
      expect(CryptoJS.HmacSHA256).toHaveBeenNthCalledWith(2, 'region', mockWordArray);
      expect(CryptoJS.HmacSHA256).toHaveBeenNthCalledWith(3, 'service', mockWordArray);
      expect(CryptoJS.HmacSHA256).toHaveBeenNthCalledWith(4, 'aws4_request', mockWordArray);
      expect(result).toBe(mockWordArray);
    });
  });

  describe('getSignedURL', () => {
    it('returns a signed wss URL with all required params', () => {
      const url = service.getSignedURL(mockSession);
      expect(url).toMatch(/^wss:\/\//);
      expect(url).toContain('/mqtt?');
      expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(url).toContain('X-Amz-Credential=access%2F20250101%2Fus-east-1%2Fiotdevicegateway%2Faws4_request');
      expect(url).toContain('X-Amz-Date=20250101T123456Z');
      expect(url).toContain('X-Amz-Expires=86400');
      expect(url).toContain('X-Amz-SignedHeaders=host');
      expect(url).toContain('X-Amz-Signature=mocked-hash');
      expect(url).toContain('X-Amz-Security-Token=token');
    });

    it('omits X-Amz-Security-Token if sessionToken is empty', () => {
      const session = { ...mockSession, credentials: { ...mockSession.credentials, sessionToken: '' } } as AuthSession;
      const url = service.getSignedURL(session);
      expect(url).not.toContain('X-Amz-Security-Token=');
    });

    it('handles missing credentials gracefully', () => {
      const session = { identityId: 'id-123' } as AuthSession;
      expect(() => service.getSignedURL(session)).not.toThrow();
      expect(service.getSignedURL(session)).toContain('X-Amz-Credential=undefined%2F20250101%2Fus-east-1%2Fiotdevicegateway%2Faws4_request');
    });

    it('calls dayjs.extend and utc', () => {
      service.getSignedURL(mockSession);
      expect(dayjs.extend).toHaveBeenCalled();
      expect(dayjs.utc).toHaveBeenCalled();
    });

    it('logs debug info', () => {
      service.getSignedURL(mockSession);
      expect(console.log).toHaveBeenCalledWith('[SigV4Service]: secretAccessKey:', 'secret');
      expect(console.log).toHaveBeenCalledWith('[SigV4Service]: accessKeyId:', 'access');
      expect(console.log).toHaveBeenCalledWith('[SigV4Service]: sessionToken:', 'token');
      expect(console.log).toHaveBeenCalledWith('[SigV4Service]: clientId:', 'id-123');
      expect(console.log).toHaveBeenCalledWith('[SigV4Service]: canonicalRequest:', expect.any(String));
      expect(console.log).toHaveBeenCalledWith('[SigV4Service]: stringToSign:', expect.any(String));
      expect(console.log).toHaveBeenCalledWith('[SigV4Service]: signingKey:', mockWordArray);
      expect(console.log).toHaveBeenCalledWith('[SigV4Service]: request url:', expect.any(String));
    });

    it('encodes special characters in credentials', () => {
      const session = {
        ...mockSession,
        credentials: {
          ...mockSession.credentials,
          accessKeyId: 'a+b/c=d',
          sessionToken: 'tok+en/with=special'
        }
      } as AuthSession;
      const url = service.getSignedURL(session);
      expect(url).toContain('X-Amz-Credential=a%2Bb%2Fc%3Dd%2F20250101%2Fus-east-1%2Fiotdevicegateway%2Faws4_request');
      expect(url).toContain('X-Amz-Security-Token=tok%2Ben%2Fwith%3Dspecial');
    });

    it('includes all required query parameters', () => {
      const url = service.getSignedURL(mockSession);
      [
        'X-Amz-Algorithm=AWS4-HMAC-SHA256',
        'X-Amz-Credential=',
        'X-Amz-Date=',
        'X-Amz-Expires=86400',
        'X-Amz-SignedHeaders=host',
        'X-Amz-Signature=',
        'X-Amz-Security-Token='
      ].forEach(param => expect(url).toContain(param));
    });
  });

  describe('error handling', () => {
    it('throws if crypto op fails', () => {
      (CryptoJS.HmacSHA256 as jest.Mock).mockImplementationOnce(() => { throw new Error('fail'); });
      expect(() => service.sign('k', 'm')).toThrow('fail');
    });
  });
});