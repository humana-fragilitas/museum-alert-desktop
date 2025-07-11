import { TestBed } from '@angular/core/testing';
import { SigV4Service } from './sig-v4.service';
import { AuthSession } from 'aws-amplify/auth';
import * as CryptoJS from 'crypto-js';
import dayjs from 'dayjs';

// Mock environment configuration
jest.mock('../../../../environments/environment', () => ({
  APP_CONFIG: {
    aws: {
      IoTCore: {
        endpoint: 'test-endpoint.iot.us-east-1.amazonaws.com',
        service: 'iotdevicegateway'
      },
      algorithm: 'AWS4-HMAC-SHA256',
      region: 'us-east-1'
    }
  }
}));

// Mock CryptoJS module
jest.mock('crypto-js', () => {
  const mockWordArray = {
    toString: jest.fn().mockReturnValue('mocked-hash')
  };

  return {
    HmacSHA256: jest.fn().mockReturnValue(mockWordArray),
    SHA256: jest.fn().mockReturnValue(mockWordArray),
    enc: {
      Hex: 'hex',
      Utf8: {
        parse: jest.fn().mockReturnValue(mockWordArray)
      }
    },
    lib: {
      WordArray: jest.fn()
    }
  };
});

// Mock dayjs
jest.mock('dayjs', () => {
  const mockDayjs = {
    extend: jest.fn(),
    utc: jest.fn(() => ({
      format: jest.fn((format: string) => {
        if (format === 'YYYYMMDD') return '20240115';
        if (format === 'HHmmss') return '120000';
        return '';
      })
    }))
  };
  return mockDayjs;
});

describe('SigV4Service', () => {
  let service: SigV4Service;
  let mockAuthSession: AuthSession;
  let mockCryptoJS: jest.Mocked<typeof CryptoJS>;
  let mockWordArray: any;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SigV4Service]
    });
    service = TestBed.inject(SigV4Service);

    // Get the mocked CryptoJS module
    mockCryptoJS = CryptoJS as jest.Mocked<typeof CryptoJS>;
    mockWordArray = {
      toString: jest.fn().mockReturnValue('mocked-hash')
    };

    // Reset and reconfigure mocks for each test
    (mockCryptoJS.HmacSHA256 as jest.Mock).mockReturnValue(mockWordArray);
    (mockCryptoJS.SHA256 as jest.Mock).mockReturnValue(mockWordArray);
    (mockWordArray.toString as jest.Mock).mockReturnValue('mocked-hash');

    // Mock AuthSession data
    mockAuthSession = {
      credentials: {
        secretAccessKey: 'test-secret-key',
        accessKeyId: 'test-access-key',
        sessionToken: 'test-session-token'
      },
      identityId: 'test-identity-id'
    } as AuthSession;

    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'dir').mockImplementation(() => {});
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should be injectable', () => {
      expect(service).toBeInstanceOf(SigV4Service);
    });
  });

  describe('sign method', () => {
    it('should generate HMAC-SHA256 signature', () => {
      const key = 'test-key';
      const message = 'test-message';
      
      const result = service.sign(key, message);

      expect(mockCryptoJS.HmacSHA256).toHaveBeenCalledWith(message, key);
      expect(mockWordArray.toString).toHaveBeenCalledWith('hex');
      expect(result).toBe('mocked-hash');
    });

    it('should handle WordArray inputs', () => {
      const keyWordArray = mockWordArray;
      const messageWordArray = mockWordArray;
      
      const result = service.sign(keyWordArray, messageWordArray);

      expect(mockCryptoJS.HmacSHA256).toHaveBeenCalledWith(messageWordArray, keyWordArray);
      expect(result).toBe('mocked-hash');
    });
  });

  describe('sha256 method', () => {
    it('should generate SHA256 hash', () => {
      const message = 'test-message';
      
      const result = service.sha256(message);

      expect(mockCryptoJS.SHA256).toHaveBeenCalledWith(message);
      expect(mockWordArray.toString).toHaveBeenCalledWith('hex');
      expect(result).toBe('mocked-hash');
    });

    it('should handle WordArray input', () => {
      const messageWordArray = mockWordArray;
      
      const result = service.sha256(messageWordArray);

      expect(mockCryptoJS.SHA256).toHaveBeenCalledWith(messageWordArray);
      expect(result).toBe('mocked-hash');
    });
  });

  describe('getSignatureKey method', () => {
    it('should generate AWS4 signature key', () => {
      const key = 'test-key';
      const dateStamp = '20240115';
      const regionName = 'us-east-1';
      const serviceName = 'iotdevicegateway';

      const result = service.getSignatureKey(key, dateStamp, regionName, serviceName);

      expect(mockCryptoJS.HmacSHA256).toHaveBeenCalledTimes(4);
      expect(mockCryptoJS.HmacSHA256).toHaveBeenNthCalledWith(1, dateStamp, `AWS4${key}`);
      expect(mockCryptoJS.HmacSHA256).toHaveBeenNthCalledWith(2, regionName, mockWordArray);
      expect(mockCryptoJS.HmacSHA256).toHaveBeenNthCalledWith(3, serviceName, mockWordArray);
      expect(mockCryptoJS.HmacSHA256).toHaveBeenNthCalledWith(4, 'aws4_request', mockWordArray);
      expect(result).toBe(mockWordArray);
    });

    it('should handle WordArray inputs', () => {
      const keyWordArray = mockWordArray;
      const dateStampWordArray = mockWordArray;
      const regionWordArray = mockWordArray;
      const serviceWordArray = mockWordArray;

      const result = service.getSignatureKey(keyWordArray, dateStampWordArray, regionWordArray, serviceWordArray);

      expect(mockCryptoJS.HmacSHA256).toHaveBeenCalledTimes(4);
      expect(result).toBe(mockWordArray);
    });
  });

  describe('getSignedURL method', () => {
    beforeEach(() => {
      // Reset mocks for each test to ensure clean state
      jest.clearAllMocks();
      // Mock console methods for each test
      jest.spyOn(console, 'log').mockImplementation(() => {});
      jest.spyOn(console, 'dir').mockImplementation(() => {});
    });

    it('should generate signed WebSocket URL with session token', () => {
      const result = service.getSignedURL(mockAuthSession);

      expect(result).toContain('wss://test-endpoint.iot.us-east-1.amazonaws.com/mqtt');
      expect(result).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(result).toContain('X-Amz-Credential=test-access-key%2F20240115%2Fus-east-1%2Fiotdevicegateway%2Faws4_request');
      expect(result).toContain('X-Amz-Date=20240115T120000Z');
      expect(result).toContain('X-Amz-Expires=86400');
      expect(result).toContain('X-Amz-SignedHeaders=host');
      expect(result).toContain('X-Amz-Signature=mocked-hash');
      expect(result).toContain('X-Amz-Security-Token=test-session-token');
    });

    it('should generate signed WebSocket URL without session token when empty', () => {
      const authSessionWithoutToken = {
        ...mockAuthSession,
        credentials: {
          ...mockAuthSession.credentials,
          sessionToken: ''
        }
      } as AuthSession;

      const result = service.getSignedURL(authSessionWithoutToken);

      expect(result).toContain('wss://test-endpoint.iot.us-east-1.amazonaws.com/mqtt');
      expect(result).not.toContain('X-Amz-Security-Token');
    });

    it('should handle undefined credentials gracefully', () => {
      const authSessionWithUndefinedCredentials = {
        identityId: 'test-identity-id'
      } as AuthSession;

      const result = service.getSignedURL(authSessionWithUndefinedCredentials);

      expect(result).toContain('wss://test-endpoint.iot.us-east-1.amazonaws.com/mqtt');
      expect(result).toContain('X-Amz-Credential=undefined%2F20240115%2Fus-east-1%2Fiotdevicegateway%2Faws4_request');
    });

    it('should call dayjs.extend with utc plugin', () => {
      service.getSignedURL(mockAuthSession);

      expect(dayjs.extend).toHaveBeenCalled();
      expect(dayjs.utc).toHaveBeenCalled();
    });

    it('should log debug information', () => {
      service.getSignedURL(mockAuthSession);

      expect(console.log).toHaveBeenCalledWith('secretAccessKey', 'test-secret-key');
      expect(console.log).toHaveBeenCalledWith('accessKeyId', 'test-access-key');
      expect(console.log).toHaveBeenCalledWith('sessionToken', 'test-session-token');
      expect(console.log).toHaveBeenCalledWith('clientId', 'test-identity-id');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('canonicalRequest:'));
      expect(console.log).toHaveBeenCalledWith('stringToSign: \n');
      expect(console.log).toHaveBeenCalledWith('signingKey: \n');
      expect(console.dir).toHaveBeenCalled();
    });
  });

  describe('AWS Signature V4 Flow Integration', () => {
    it('should create a valid canonical request structure', () => {
      service.getSignedURL(mockAuthSession);

      // Verify SHA256 was called for canonical request hashing
      expect(mockCryptoJS.SHA256).toHaveBeenCalled();
      
      // Verify signature key generation was called
      expect(mockCryptoJS.HmacSHA256).toHaveBeenCalledWith(
        '20240115',
        'AWS4test-secret-key'
      );
      
      // Verify final signing was called
      const hmacCalls = (mockCryptoJS.HmacSHA256 as jest.Mock).mock.calls;
      const lastCall = hmacCalls[hmacCalls.length - 1];
      expect(lastCall[1]).toBe(mockWordArray); // signing key
      expect(lastCall[0]).toContain('AWS4-HMAC-SHA256'); // string to sign
    });
  });

  describe('Error Handling', () => {
    it('should handle missing credentials object', () => {
      const authSessionWithoutCredentials = {
        identityId: 'test-identity-id'
      } as AuthSession;

      expect(() => service.getSignedURL(authSessionWithoutCredentials)).not.toThrow();
    });

    it('should handle crypto operations errors gracefully', () => {
      // Temporarily mock HmacSHA256 to throw an error
      (mockCryptoJS.HmacSHA256 as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Crypto operation failed');
      });

      expect(() => service.sign('key', 'message')).toThrow('Crypto operation failed');
    });
  });

  describe('URL Encoding and Structure', () => {
    it('should properly encode special characters in credentials', () => {
      const authSessionWithSpecialChars = {
        ...mockAuthSession,
        credentials: {
          ...mockAuthSession.credentials,
          accessKeyId: 'test+access/key=',
          sessionToken: 'token+with/special=chars'
        }
      } as AuthSession;

      const result = service.getSignedURL(authSessionWithSpecialChars);

      expect(result).toContain('X-Amz-Credential=test%2Baccess%2Fkey%3D%2F');
      expect(result).toContain('X-Amz-Security-Token=token%2Bwith%2Fspecial%3Dchars');
    });

    it('should include all required query parameters', () => {
      const result = service.getSignedURL(mockAuthSession);
      
      const requiredParams = [
        'X-Amz-Algorithm=AWS4-HMAC-SHA256',
        'X-Amz-Credential=',
        'X-Amz-Date=',
        'X-Amz-Expires=86400',
        'X-Amz-SignedHeaders=host',
        'X-Amz-Signature=',
        'X-Amz-Security-Token='
      ];

      requiredParams.forEach(param => {
        expect(result).toContain(param);
      });
    });

    it('should use correct WebSocket protocol and path', () => {
      const result = service.getSignedURL(mockAuthSession);

      expect(result).toMatch(/^wss:\/\//);
      expect(result).toContain('/mqtt?');
    });
  });
});