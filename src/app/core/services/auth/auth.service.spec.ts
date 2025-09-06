import { fetchAuthSession,
         getCurrentUser,
         fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';

import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { AuthService } from './auth.service';

import { WINDOW } from '@tokens/window';


jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchUserAttributes: jest.fn()
}));

jest.mock('@aws-amplify/core', () => ({
  Hub: { listen: jest.fn() }
}));

jest.mock('@shared/helpers/milliseconds-to-readable-time.helper', () => ({
  msToHMS: jest.fn().mockReturnValue({ h: 1, m: 30, s: 45 })
}));

const mockWindow = {
  electron: {
    ipcRenderer: {
      on: jest.fn()
    }
  },
  addEventListener: jest.fn()
};

describe('AuthService', () => {
  let service: AuthService;
  let mockFetchAuthSession: jest.Mock;
  let mockGetCurrentUser: jest.Mock;
  let mockFetchUserAttributes: jest.Mock;
  let mockHubListen: jest.Mock;
  let ngZone: NgZone;

  const validSession = {
    credentials: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      sessionToken: 'test-session-token',
      expiration: new Date(Date.now() + 3600000)
    },
    identityId: 'test-identity-id',
    tokens: {
      accessToken: { 
        toString: () => 'test-access-token',
        payload: {
          'exp': Math.floor((Date.now() + 3600000) / 1000),
          'sub': 'test-user-sub'
        }
      },
      idToken: { 
        toString: () => 'test-id-token',
        payload: {
          'custom:Company': 'test-company',
          'custom:hasPolicy': '1',
          'email': 'test@example.com',
          'name': 'Test User'
        }
      }
    },
    userSub: 'test-user-sub'
  };

  const validUser = { 
    username: 'test-username', 
    userId: 'test-user-id', 
    signInDetails: { loginId: 'test@example.com' } 
  };

  const validAttributes = { 
    email: 'test@example.com', 
    name: 'Test User',
    'custom:Company': 'test-company',
    'custom:hasPolicy': '1'
  };

  beforeEach(() => {

    jest.clearAllMocks();

    mockFetchAuthSession = fetchAuthSession as jest.Mock;
    mockGetCurrentUser = getCurrentUser as jest.Mock;
    mockFetchUserAttributes = fetchUserAttributes as jest.Mock;
    mockHubListen = Hub.listen as jest.Mock;

    mockFetchAuthSession.mockResolvedValue(validSession);
    mockGetCurrentUser.mockResolvedValue(validUser);
    mockFetchUserAttributes.mockResolvedValue(validAttributes);
    mockHubListen.mockImplementation(() => {});

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    
    TestBed.configureTestingModule({ 
      providers: [
        AuthService,
        { provide: WINDOW, useValue: mockWindow }
      ] 
    });

    service = TestBed.inject(AuthService);
    ngZone = TestBed.inject(NgZone);

  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {

    it('should create the service successfully', () => {
      expect(service).toBeTruthy();
      expect(service).toBeInstanceOf(AuthService);
    });

    it('should initialize with proper default signal values', async () => {
      jest.clearAllMocks();
      
      (fetchAuthSession as jest.Mock).mockResolvedValue(validSession);
      (getCurrentUser as jest.Mock).mockResolvedValue(validUser);
      (fetchUserAttributes as jest.Mock).mockResolvedValue(validAttributes);
      (Hub.listen as jest.Mock).mockImplementation(() => {});
      
      await service.fetchSession();
      await service.fetchUser();
      await service.fetchAttributes();
      
      expect(fetchAuthSession).toHaveBeenCalledWith({ forceRefresh: false });
      expect(getCurrentUser).toHaveBeenCalled();
      expect(fetchUserAttributes).toHaveBeenCalled();
      
      expect(service.sessionData()).toEqual(validSession);
      expect(service.user()).toEqual(validUser);
      expect(service.userAttributes()).toEqual(validAttributes);
    });

    it('should set up Hub listener for auth events on initialization', () => {
      expect(mockHubListen).toHaveBeenCalledWith('auth', expect.any(Function));
      expect(mockHubListen).toHaveBeenCalledTimes(1);
    });

    it('should fetch initial session data on initialization', () => {
      expect(mockFetchAuthSession).toHaveBeenCalledWith({ forceRefresh: false });
    });

  });

  describe('Session Management', () => {

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('fetchSession', () => {
      it('should successfully fetch and set session data', async () => {
        const newSession = { ...validSession, identityId: 'new-identity-id' };
        mockFetchAuthSession.mockResolvedValue(newSession);

        await service.fetchSession();

        expect(mockFetchAuthSession).toHaveBeenCalledWith({ forceRefresh: false });
        expect(service.sessionData()).toEqual(newSession);
      });

      it('should handle forceRefresh option correctly', async () => {
        await service.fetchSession({ forceRefresh: true });

        expect(mockFetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
      });

      it('should set session to null when fetch fails', async () => {
        const error = new Error('Authentication failed');
        mockFetchAuthSession.mockRejectedValue(error);

        await service.fetchSession();

        expect(service.sessionData()).toBeNull();
      });

      it('should prevent concurrent fetch operations', async () => {
        (service as any).isFetchingSession = true;

        await service.fetchSession();

        expect(mockFetchAuthSession).not.toHaveBeenCalled();
      });

      it('should validate session data and reject invalid sessions', async () => {
        const invalidSession = {
          credentials: null,
          identityId: null,
          tokens: null,
          userSub: null
        };
        mockFetchAuthSession.mockResolvedValue(invalidSession);

        await service.fetchSession();

        expect(service.sessionData()).toBeNull();
      });

      it('should handle partially valid session data', async () => {
        const partialSession = {
          credentials: validSession.credentials,
          identityId: validSession.identityId,
          tokens: null,
          userSub: validSession.userSub
        };
        mockFetchAuthSession.mockResolvedValue(partialSession);

        await service.fetchSession();

        expect(service.sessionData()).toBeNull();
      });
    });

    describe('fetchUser', () => {
      it('should successfully fetch and set user data', async () => {
        const newUser = { ...validUser, username: 'new-username' };
        mockGetCurrentUser.mockResolvedValue(newUser);

        await service.fetchUser();

        expect(mockGetCurrentUser).toHaveBeenCalled();
        expect(service.user()).toEqual(newUser);
      });

      it('should set user to null when fetch fails', async () => {
        const error = new Error('User fetch failed');
        mockGetCurrentUser.mockRejectedValue(error);

        await service.fetchUser();

        expect(service.user()).toBeNull();
      });
    });

    describe('fetchAttributes', () => {
      it('should successfully fetch and set user attributes', async () => {
        const newAttributes = { ...validAttributes, email: 'new@example.com' };
        mockFetchUserAttributes.mockResolvedValue(newAttributes);

        await service.fetchAttributes();

        expect(mockFetchUserAttributes).toHaveBeenCalled();
        expect(service.userAttributes()).toEqual(newAttributes);
      });

      it('should set attributes to null when fetch fails', async () => {
        const error = new Error('Attributes fetch failed');
        mockFetchUserAttributes.mockRejectedValue(error);

        await service.fetchAttributes();

        expect(service.userAttributes()).toBeNull();
      });
    });

  });

  describe('Computed Properties', () => {

    beforeEach(() => {
      (service as any).sessionDataSignal.set(validSession);
      (service as any).userSignal.set(validUser);
      (service as any).userAttributesSignal.set(validAttributes);
    });

    it('should compute userLoginId correctly', () => {
      expect(service.userLoginId()).toBe('test@example.com');
    });

    it('should compute company correctly', () => {
      expect(service.company()).toBe('test-company');
    });

    it('should compute hasPolicy correctly when user has policy', () => {
      expect(service.hasPolicy()).toBe(true);
    });

    it('should compute hasPolicy correctly when user has no policy', () => {
      const sessionWithoutPolicy = {
        ...validSession,
        tokens: {
          ...validSession.tokens,
          idToken: {
            ...validSession.tokens.idToken,
            payload: {
              ...validSession.tokens.idToken.payload,
              'custom:hasPolicy': '0'
            }
          }
        }
      };
      (service as any).sessionDataSignal.set(sessionWithoutPolicy);

      expect(service.hasPolicy()).toBe(false);
    });

    it('should compute idToken correctly', () => {
      expect(service.idToken()).toBe('test-id-token');
    });

    it('should compute accessToken correctly', () => {
      expect(service.accessToken()).toBe('test-access-token');
    });

    it('should return default values when no data is available', () => {
      (service as any).sessionDataSignal.set(null);
      (service as any).userSignal.set(null);
      (service as any).userAttributesSignal.set(null);

      expect(service.userLoginId()).toBe('');
      expect(service.company()).toBe('');
      expect(service.hasPolicy()).toBe(false);
      expect(service.idToken()).toBe('');
      expect(service.accessToken()).toBe('');
    });

  });

  describe('Session Token Expiration', () => {

    it('should correctly calculate access token expiration time for valid session', () => {
      (service as any).sessionDataSignal.set(validSession);

      const expirationTime = service.accessTokenExpirationTimeMS();
      
      expect(expirationTime).toBeGreaterThan(0);
      expect(expirationTime).toBeLessThanOrEqual(3600000);
    });

    it('should return -1 for expiration time when no session exists', () => {
      (service as any).sessionDataSignal.set(null);

      const expirationTime = service.accessTokenExpirationTimeMS();
      
      expect(expirationTime).toBe(-1);
    });

    it('should return 0 for expiration time when session is expired', () => {
      const expiredSession = {
        ...validSession,
        credentials: {
          ...validSession.credentials,
          expiration: new Date(Date.now() - 1000)
        }
      };
      (service as any).sessionDataSignal.set(expiredSession);

      const expirationTime = service.accessTokenExpirationTimeMS();
      
      expect(expirationTime).toBe(0);
    });

    it('should return false for isSessionTokenExpired when session is valid', () => {
      (service as any).sessionDataSignal.set(validSession);

      expect(service.isSessionTokenExpired()).toBe(false);
    });

    it('should return true for isSessionTokenExpired when session is expired', () => {
      const expiredSession = {
        ...validSession,
        credentials: {
          ...validSession.credentials,
          expiration: new Date(Date.now() - 1000)
        }
      };
      (service as any).sessionDataSignal.set(expiredSession);

      expect(service.isSessionTokenExpired()).toBe(true);
    });

    it('should return false for isSessionTokenExpired when no session data exists', () => {
      (service as any).sessionDataSignal.set(null);

      expect(service.isSessionTokenExpired()).toBe(false);
    });

  });

  describe('Hub Authentication Events', () => {

    let hubCallback: Function;

    beforeEach(() => {
      expect(mockHubListen).toHaveBeenCalledWith('auth', expect.any(Function));
      hubCallback = mockHubListen.mock.calls[0][1];
      
      jest.clearAllMocks();
    });

    it('should fetch session on signedIn event', () => {
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession').mockResolvedValue();

      hubCallback({ payload: { event: 'signedIn' } });

      expect(fetchSessionSpy).toHaveBeenCalledTimes(1);
    });

    it('should fetch session on signedOut event', () => {
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession').mockResolvedValue();

      hubCallback({ payload: { event: 'signedOut' } });

      expect(fetchSessionSpy).toHaveBeenCalledTimes(1);
    });

    it('should not fetch session on tokenRefresh event', () => {
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession').mockResolvedValue();

      hubCallback({ payload: { event: 'tokenRefresh' } });

      expect(fetchSessionSpy).not.toHaveBeenCalled();
    });

    it('should not fetch session on unrecognized events', () => {
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession').mockResolvedValue();

      hubCallback({ payload: { event: 'customEvent' } });

      expect(fetchSessionSpy).not.toHaveBeenCalled();
    });

    it('should handle malformed event data gracefully', () => {
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession').mockResolvedValue();

      expect(() => hubCallback({})).not.toThrow();
      expect(fetchSessionSpy).not.toHaveBeenCalled();

      expect(() => hubCallback({ payload: {} })).not.toThrow();
      expect(fetchSessionSpy).not.toHaveBeenCalled();
    });

  });

  describe('Error Handling', () => {

    it('should handle network errors gracefully during session fetch', async () => {
      const networkError = new Error('Network unavailable');
      mockFetchAuthSession.mockRejectedValue(networkError);

      await service.fetchSession();

      expect(service.sessionData()).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '[AuthService]: failed to fetch session:', 
        networkError
      );
    });

    it('should handle authentication errors gracefully during user fetch', async () => {
      const authError = new Error('User not authenticated');
      mockGetCurrentUser.mockRejectedValue(authError);

      await service.fetchUser();

      expect(service.user()).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '[AuthService]: failed to fetch user:', 
        authError
      );
    });

    it('should handle permission errors gracefully during attributes fetch', async () => {
      const permissionError = new Error('Insufficient permissions');
      mockFetchUserAttributes.mockRejectedValue(permissionError);

      await service.fetchAttributes();

      expect(service.userAttributes()).toBeNull();
      expect(console.error).toHaveBeenCalledWith(
        '[AuthService]: failed to fetch user attributes:', 
        permissionError
      );
    });

  });

  describe('Edge Cases', () => {

    it('should handle undefined session tokens gracefully', () => {
      const sessionWithUndefinedTokens = {
        ...validSession,
        tokens: {
          accessToken: undefined,
          idToken: undefined
        }
      };
      (service as any).sessionDataSignal.set(sessionWithUndefinedTokens);

      expect(service.idToken()).toBe('');
      expect(service.accessToken()).toBe('');
      expect(service.company()).toBe('');
      expect(service.hasPolicy()).toBe(false);
    });

    it('should handle session with missing expiration date', () => {
      const sessionWithoutExpiration = {
        ...validSession,
        credentials: {
          ...validSession.credentials,
          expiration: undefined
        }
      };
      (service as any).sessionDataSignal.set(sessionWithoutExpiration);

      expect(service.accessTokenExpirationTimeMS()).toBe(0);
      expect(service.isSessionTokenExpired()).toBe(true);
    });

    it('should handle empty string values in token payloads', () => {
      const sessionWithEmptyValues = {
        ...validSession,
        tokens: {
          ...validSession.tokens,
          idToken: {
            ...validSession.tokens.idToken,
            payload: {
              'custom:Company': '',
              'custom:hasPolicy': ''
            }
          }
        }
      };
      (service as any).sessionDataSignal.set(sessionWithEmptyValues);

      expect(service.company()).toBe('');
      expect(service.hasPolicy()).toBe(false);
    });

  });

});