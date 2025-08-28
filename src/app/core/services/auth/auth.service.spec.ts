import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { WINDOW } from '@tokens/window';
import { MainProcessEvent } from '@shared-with-electron';

jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchUserAttributes: jest.fn()
}));
jest.mock('@aws-amplify/core', () => ({
  Hub: { listen: jest.fn() }
}));
jest.mock('@shared/helpers/console.helper', () => ({
  titleStyle: ''
}));
jest.mock('@shared/helpers/milliseconds-to-readable-time.helper', () => ({
  msToHMS: jest.fn().mockReturnValue({ h: 1, m: 30, s: 45 })
}));

// Mock window object for electron
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

  const mockSession = {
    credentials: {
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      sessionToken: 'token',
      expiration: new Date(Date.now() + 3600000) // 1 hour from now
    },
    identityId: 'id',
    tokens: {
      accessToken: { 
        toString: () => 'access',
        payload: {}
      },
      idToken: { 
        toString: () => 'id',
        payload: {
          'custom:Company': 'test-company',
          'custom:hasPolicy': '1'
        }
      }
    },
    userSub: 'sub'
  };
  const mockUser = { username: 'user', userId: 'id', signInDetails: { loginId: 'login' } };
  const mockAttributes = { email: 'a@b.com', name: 'Name' };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockFetchAuthSession = fetchAuthSession as jest.Mock;
    mockGetCurrentUser = getCurrentUser as jest.Mock;
    mockFetchUserAttributes = fetchUserAttributes as jest.Mock;
    mockHubListen = Hub.listen as jest.Mock;
    mockFetchAuthSession.mockResolvedValue(mockSession);
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFetchUserAttributes.mockResolvedValue(mockAttributes);
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
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('should create the service', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch session and set sessionData', async () => {
    await service.fetchSession();
    expect(mockFetchAuthSession).toHaveBeenCalled();
    expect(service.sessionData()).toEqual(mockSession);
  });

  it('should set sessionData to null on fetch error', async () => {
    mockFetchAuthSession.mockRejectedValueOnce(new Error('fail'));
    await service.fetchSession();
    expect(service.sessionData()).toBeNull();
  });

  it('should fetch user and set userSignal', async () => {
    await service.fetchUser();
    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(service.user()).toEqual(mockUser);
  });

  it('should set user to null on fetchUser error', async () => {
    mockGetCurrentUser.mockRejectedValueOnce(new Error('fail'));
    await service.fetchUser();
    expect(service.user()).toBeNull();
  });

  it('should fetch attributes and set userAttributesSignal', async () => {
    await service.fetchAttributes();
    expect(mockFetchUserAttributes).toHaveBeenCalled();
    expect(service.userAttributes()).toEqual(mockAttributes);
  });

  it('should set userAttributes to null on fetchAttributes error', async () => {
    mockFetchUserAttributes.mockRejectedValueOnce(new Error('fail'));
    await service.fetchAttributes();
    expect(service.userAttributes()).toBeNull();
  });

  it('should compute userLoginId, company, hasPolicy, idToken, accessToken', async () => {
    await service.fetchSession();
    await service.fetchUser();
    expect(service.userLoginId()).toBe('login');
    expect(service.company()).toBe('test-company');
    expect(service.hasPolicy()).toBe(true);
    expect(service.idToken()).toBe('id');
    expect(service.accessToken()).toBe('access');
  });

  it('should skip fetchSession if already fetching', async () => {
    (service as any).isFetchingSession = true;
    await service.fetchSession();
    expect(mockFetchAuthSession).not.toHaveBeenCalled();
  });

  it('should listen to Hub auth events and fetch session', async () => {
    expect(mockHubListen).toHaveBeenCalledWith('auth', expect.any(Function));
    const callback = mockHubListen.mock.calls[0][1];
    
    // Clear previous calls from constructor and spy on fetchSession
    mockFetchAuthSession.mockClear();
    const fetchSessionSpy = jest.spyOn(service, 'fetchSession');
    
    // Test signedIn event
    await callback({ payload: { event: 'signedIn' } });
    expect(fetchSessionSpy).toHaveBeenCalled();
    
    // Test signedOut event
    fetchSessionSpy.mockClear();
    await callback({ payload: { event: 'signedOut' } });
    expect(fetchSessionSpy).toHaveBeenCalled();
    
    // Test other events (should not trigger fetchSession)
    fetchSessionSpy.mockClear();
    await callback({ payload: { event: 'tokenRefresh' } });
    expect(fetchSessionSpy).not.toHaveBeenCalled();
  });

  describe('Session expiration', () => {
    it('should correctly calculate access token expiration time', async () => {
      await service.fetchSession();
      const expirationTime = service.accessTokenExpirationTimeMS();
      expect(expirationTime).toBeGreaterThan(0);
      expect(expirationTime).toBeLessThanOrEqual(3600000); // 1 hour
    });

    it('should return 0 for expiration time when no session', async () => {
      // Set up service with no session
      mockFetchAuthSession.mockResolvedValueOnce({});
      await service.fetchSession();
      const expirationTime = service.accessTokenExpirationTimeMS();
      expect(expirationTime).toBe(0);
    });

    it('should return false for isSessionTokenExpired when session is valid', async () => {
      await service.fetchSession();
      expect(service.isSessionTokenExpired()).toBe(false);
    });

    it('should return true for isSessionTokenExpired when session is expired', async () => {
      // Mock expired session
      const expiredSession = {
        ...mockSession,
        credentials: {
          ...mockSession.credentials,
          expiration: new Date(Date.now() - 1000) // 1 second ago
        }
      };
      mockFetchAuthSession.mockResolvedValueOnce(expiredSession);
      await service.fetchSession();
      expect(service.isSessionTokenExpired()).toBe(true);
    });
  });

  describe('System event handling', () => {
    let mockAddEventListener: jest.Mock;
    let mockIpcOn: jest.Mock;

    beforeEach(() => {
      mockAddEventListener = mockWindow.addEventListener as jest.Mock;
      mockIpcOn = mockWindow.electron.ipcRenderer.on as jest.Mock;
    });

    it('should set up online event listener', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
    });

    it('should set up electron IPC event listeners', () => {
      expect(mockIpcOn).toHaveBeenCalledWith(MainProcessEvent.WINDOW_FOCUSED, expect.any(Function));
      expect(mockIpcOn).toHaveBeenCalledWith(MainProcessEvent.SESSION_CHECK, expect.any(Function));
      expect(mockIpcOn).toHaveBeenCalledWith(MainProcessEvent.SYSTEM_RESUMED, expect.any(Function));
    });

    it('should refresh session on online event', () => {
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession');
      const onlineCallback = mockAddEventListener.mock.calls.find(
        call => call[0] === 'online'
      )[1];
      
      onlineCallback();
      expect(fetchSessionSpy).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should refresh session on system resume', () => {
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession');
      const systemResumedCallback = mockIpcOn.mock.calls.find(
        call => call[0] === MainProcessEvent.SYSTEM_RESUMED
      )[1];
      
      systemResumedCallback();
      expect(fetchSessionSpy).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should check session expiration on window focus', async () => {
      // Set up expired session
      const expiredSession = {
        ...mockSession,
        credentials: {
          ...mockSession.credentials,
          expiration: new Date(Date.now() - 1000)
        }
      };
      mockFetchAuthSession.mockResolvedValueOnce(expiredSession);
      await service.fetchSession();
      
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession');
      const windowFocusCallback = mockIpcOn.mock.calls.find(
        call => call[0] === MainProcessEvent.WINDOW_FOCUSED
      )[1];
      
      windowFocusCallback();
      expect(fetchSessionSpy).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should not refresh session on window focus if session is still valid', async () => {
      await service.fetchSession(); // Valid session
      
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession');
      fetchSessionSpy.mockClear();
      
      const windowFocusCallback = mockIpcOn.mock.calls.find(
        call => call[0] === MainProcessEvent.WINDOW_FOCUSED
      )[1];
      
      windowFocusCallback();
      expect(fetchSessionSpy).not.toHaveBeenCalled();
    });
  });

  describe('fetchSession with options', () => {
    it('should pass forceRefresh option to fetchAuthSession', async () => {
      await service.fetchSession({ forceRefresh: true });
      expect(mockFetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should handle invalid session data correctly', async () => {
      const invalidSession = {
        credentials: null,
        identityId: null,
        tokens: null,
        userSub: null
      };
      mockFetchAuthSession.mockResolvedValueOnce(invalidSession);
      
      await service.fetchSession();
      expect(service.sessionData()).toBeNull();
    });

    it('should handle partial session data correctly', async () => {
      const partialSession = {
        credentials: mockSession.credentials,
        identityId: mockSession.identityId,
        tokens: null, // Missing tokens
        userSub: mockSession.userSub
      };
      mockFetchAuthSession.mockResolvedValueOnce(partialSession);
      
      await service.fetchSession();
      expect(service.sessionData()).toBeNull();
    });
  });

});