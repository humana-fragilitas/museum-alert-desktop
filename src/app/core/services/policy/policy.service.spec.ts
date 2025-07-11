import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError, Subject } from 'rxjs';

import { PolicyService } from './policy.service';
import { AuthService } from '../auth/auth.service';
import { APP_CONFIG } from '../../../../environments/environment';
import { AuthSession } from 'aws-amplify/auth';

// Mock environment
jest.mock('../../../../environments/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://test-api.example.com'
    }
  }
}));

describe('PolicyService', () => {
  let service: PolicyService;
  let httpMock: HttpTestingController;
  let authServiceMock: jest.Mocked<AuthService>;
  let sessionDataSubject: Subject<AuthSession | null>;

  const mockSessionWithoutPolicy: AuthSession = {
    tokens: {
      idToken: {
        payload: {
          'custom:hasPolicy': '0'
        },
        toString: () => 'mock-id-token'
      },
      accessToken: {
        payload: {},
        toString: () => 'mock-access-token'
      }
    },
    credentials: {
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key',
      sessionToken: 'mock-session-token'
    },
    identityId: 'mock-identity-id',
    userSub: 'mock-user-sub'
  } as AuthSession;

  const mockSessionWithPolicy: AuthSession = {
    tokens: {
      idToken: {
        payload: {
          'custom:hasPolicy': '1'
        },
        toString: () => 'mock-id-token'
      },
      accessToken: {
        payload: {},
        toString: () => 'mock-access-token'
      }
    },
    credentials: {
      accessKeyId: 'mock-access-key',
      secretAccessKey: 'mock-secret-key',
      sessionToken: 'mock-session-token'
    },
    identityId: 'mock-identity-id',
    userSub: 'mock-user-sub'
  } as AuthSession;

  beforeEach(() => {
    sessionDataSubject = new Subject<AuthSession | null>();
    
    authServiceMock = {
      sessionData: sessionDataSubject.asObservable(),
      fetchSession: jest.fn().mockReturnValue(Promise.resolve())
    } as any;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PolicyService,
        { provide: AuthService, useValue: authServiceMock }
      ]
    });

    service = TestBed.inject(PolicyService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    sessionDataSubject.complete();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should subscribe to authService.sessionData on creation', () => {
      expect(authServiceMock.sessionData).toBeDefined();
    });
  });

  describe('Session Monitoring', () => {
    it('should call attachPolicy when session has no policy', () => {
      const attachPolicySpy = jest.spyOn(service, 'attachPolicy').mockImplementation();
      
      sessionDataSubject.next(mockSessionWithoutPolicy);
      
      expect(attachPolicySpy).toHaveBeenCalledWith(mockSessionWithoutPolicy);
    });

    it('should not call attachPolicy when session has policy', () => {
      const attachPolicySpy = jest.spyOn(service, 'attachPolicy').mockImplementation();
      
      sessionDataSubject.next(mockSessionWithPolicy);
      
      expect(attachPolicySpy).not.toHaveBeenCalled();
    });

    it('should not call attachPolicy when session is null', () => {
      const attachPolicySpy = jest.spyOn(service, 'attachPolicy').mockImplementation();
      
      sessionDataSubject.next(null);
      
      expect(attachPolicySpy).not.toHaveBeenCalled();
    });

    it('should call attachPolicy when session tokens are missing (undefined !== "1")', () => {
      const attachPolicySpy = jest.spyOn(service, 'attachPolicy').mockImplementation();
      const sessionWithoutTokens = {
        credentials: {
          accessKeyId: 'mock-access-key',
          secretAccessKey: 'mock-secret-key',
          sessionToken: 'mock-session-token'
        },
        identityId: 'mock-identity-id',
        userSub: 'mock-user-sub'
      } as AuthSession;
      
      sessionDataSubject.next(sessionWithoutTokens);
      
      expect(attachPolicySpy).toHaveBeenCalledWith(sessionWithoutTokens);
    });

    it('should call attachPolicy when idToken is missing (undefined !== "1")', () => {
      const attachPolicySpy = jest.spyOn(service, 'attachPolicy').mockImplementation();
      const sessionWithoutIdToken = {
        tokens: {
          accessToken: {
            payload: {},
            toString: () => 'mock-access-token'
          }
        },
        credentials: {
          accessKeyId: 'mock-access-key',
          secretAccessKey: 'mock-secret-key',
          sessionToken: 'mock-session-token'
        },
        identityId: 'mock-identity-id',
        userSub: 'mock-user-sub'
      } as AuthSession;
      
      sessionDataSubject.next(sessionWithoutIdToken);
      
      expect(attachPolicySpy).toHaveBeenCalledWith(sessionWithoutIdToken);
    });

    it('should call attachPolicy when hasPolicy payload is missing (undefined !== "1")', () => {
      const attachPolicySpy = jest.spyOn(service, 'attachPolicy').mockImplementation();
      const sessionWithoutPolicyPayload = {
        tokens: {
          idToken: {
            payload: {
              // Missing 'custom:hasPolicy' property
              'sub': 'user-123'
            },
            toString: () => 'mock-id-token'
          },
          accessToken: {
            payload: {},
            toString: () => 'mock-access-token'
          }
        },
        credentials: {
          accessKeyId: 'mock-access-key',
          secretAccessKey: 'mock-secret-key',
          sessionToken: 'mock-session-token'
        },
        identityId: 'mock-identity-id',
        userSub: 'mock-user-sub'
      } as AuthSession;
      
      sessionDataSubject.next(sessionWithoutPolicyPayload);
      
      expect(attachPolicySpy).toHaveBeenCalledWith(sessionWithoutPolicyPayload);
    });
  });

  describe('attachPolicy Method', () => {
    it('should make POST request to correct URL', async () => {
      const expectedUrl = `${APP_CONFIG.aws.apiGateway}/user-policy`;
      
      service.attachPolicy(mockSessionWithoutPolicy);
      
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      
      req.flush({});
    });

    it('should call fetchSession with forceRefresh on successful completion', async () => {
      service.attachPolicy(mockSessionWithoutPolicy);
      
      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/user-policy`);
      req.flush({});
      
      expect(authServiceMock.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should handle HTTP errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      service.attachPolicy(mockSessionWithoutPolicy);
      
      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/user-policy`);
      req.error(new ProgressEvent('Network error'));
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(authServiceMock.fetchSession).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should not call fetchSession when HTTP request fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      service.attachPolicy(mockSessionWithoutPolicy);
      
      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/user-policy`);
      req.error(new ProgressEvent('Server error'));
      
      expect(authServiceMock.fetchSession).not.toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Integration Tests', () => {
    it('should complete the full flow: session without policy -> attach policy -> refresh session', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Trigger session change
      sessionDataSubject.next(mockSessionWithoutPolicy);
      
      // Verify HTTP request
      const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/user-policy`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      
      // Complete the request
      req.flush({});
      
      // Verify session refresh was called
      expect(authServiceMock.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
      
      consoleSpy.mockRestore();
    });

    it('should handle multiple session changes correctly', async () => {
      const attachPolicySpy = jest.spyOn(service, 'attachPolicy').mockImplementation();
      
      // First session without policy
      sessionDataSubject.next(mockSessionWithoutPolicy);
      expect(attachPolicySpy).toHaveBeenCalledTimes(1);
      
      // Second session with policy
      sessionDataSubject.next(mockSessionWithPolicy);
      expect(attachPolicySpy).toHaveBeenCalledTimes(1); // Should not increase
      
      // Third session without policy
      sessionDataSubject.next(mockSessionWithoutPolicy);
      expect(attachPolicySpy).toHaveBeenCalledTimes(2);
      
      // Null session
      sessionDataSubject.next(null);
      expect(attachPolicySpy).toHaveBeenCalledTimes(2); // Should not increase
    });
  });
});