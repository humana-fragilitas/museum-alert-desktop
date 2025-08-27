import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from '@aws-amplify/core';
import { WINDOW } from '@tokens/window';

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

// Mock window object for electron
const mockWindow = {
  electron: {
    ipcRenderer: {
      on: jest.fn()
    }
  }
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
      expiration: new Date(Date.now() + 3600000)
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

  it('should cancel session', () => {
    service.cancelSession();
    expect(service.sessionData()).toBeNull();
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

  it('should check if session token is expired correctly', async () => {
    // Test with no session (should be considered expired)
    service.cancelSession();
    expect(service.isSessionTokenExpired()).toBe(true);
    
    // Test with a valid session that's not expired
    await service.fetchSession();
    expect(service.isSessionTokenExpired()).toBe(false);
    
    // Test with expired session
    const expiredSession = {
      ...mockSession,
      credentials: { ...mockSession.credentials, expiration: new Date(Date.now() - 1000) }
    };
    mockFetchAuthSession.mockResolvedValueOnce(expiredSession);
    await service.fetchSession();
    expect(service.isSessionTokenExpired()).toBe(true);
  });

  it('should calculate access token expiration time correctly', async () => {
    await service.fetchSession();
    const timeToExpiration = service.accessTokenExpirationTimeMS();
    expect(timeToExpiration).toBeGreaterThan(0);
    expect(timeToExpiration).toBeLessThanOrEqual(3600000);
    
    // Test with no session
    service.cancelSession();
    expect(service.accessTokenExpirationTimeMS()).toBe(0);
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

});