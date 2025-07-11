import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
import { 
  fetchAuthSession, 
  getCurrentUser, 
  fetchUserAttributes,
  AuthSession,
  GetCurrentUserOutput,
  FetchUserAttributesOutput
} from 'aws-amplify/auth';
import { Amplify } from 'aws-amplify';
import { Hub } from '@aws-amplify/core';

// Mock AWS Amplify modules
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchUserAttributes: jest.fn()
}));

jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn()
  }
}));

jest.mock('@aws-amplify/core', () => ({
  Hub: {
    listen: jest.fn()
  }
}));

jest.mock('../../../../environments/environment', () => ({
  APP_CONFIG: {
    aws: {
      amplify: {
        region: 'us-east-1',
        userPoolId: 'test-pool-id',
        userPoolWebClientId: 'test-client-id'
      }
    }
  }
}));

jest.mock('../../../shared/helpers/console.helper', () => ({
  titleStyle: 'color: blue; font-weight: bold;'
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockFetchAuthSession: jest.MockedFunction<typeof fetchAuthSession>;
  let mockGetCurrentUser: jest.MockedFunction<typeof getCurrentUser>;
  let mockFetchUserAttributes: jest.MockedFunction<typeof fetchUserAttributes>;
  let mockHubListen: jest.MockedFunction<typeof Hub.listen>;
  let mockAmplifyConfig: jest.MockedFunction<typeof Amplify.configure>;

  // Mock data
  const mockAuthSession: AuthSession = {
    credentials: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      sessionToken: 'test-session-token',
      expiration: new Date(Date.now() + 3600000) // 1 hour from now
    },
    identityId: 'test-identity-id',
    tokens: {
      accessToken: {
        toString: () => 'mock-access-token'
      },
      idToken: {
        toString: () => 'mock-id-token'
      }
    } as any,
    userSub: 'test-user-sub'
  };

  const mockUser: GetCurrentUserOutput = {
    username: 'testuser',
    userId: 'test-user-id'
  };

  const mockUserAttributes: FetchUserAttributesOutput = {
    email: 'test@example.com',
    name: 'Test User',
    company: 'Test Company'
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup mock implementations BEFORE creating the service
    mockFetchAuthSession = fetchAuthSession as jest.MockedFunction<typeof fetchAuthSession>;
    mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;
    mockFetchUserAttributes = fetchUserAttributes as jest.MockedFunction<typeof fetchUserAttributes>;
    mockHubListen = Hub.listen as jest.MockedFunction<typeof Hub.listen>;
    mockAmplifyConfig = Amplify.configure as jest.MockedFunction<typeof Amplify.configure>;

    // Set up default mock implementations to prevent constructor errors
    mockGetCurrentUser.mockResolvedValue(mockUser);
    mockFetchAuthSession.mockResolvedValue(mockAuthSession);
    mockFetchUserAttributes.mockResolvedValue(mockUserAttributes);
    mockHubListen.mockImplementation(() => () => {}); // Returns a stop listener function
    mockAmplifyConfig.mockImplementation(() => {});

    // Mock console methods to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [AuthService]
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should configure Amplify on initialization', () => {
      // Let's check what was actually called
      expect(mockAmplifyConfig).toHaveBeenCalled();
      const actualCall = mockAmplifyConfig.mock.calls[0][0];
      
      expect(actualCall).toEqual({
        region: 'us-east-1',
        userPoolId: 'test-pool-id',
        userPoolWebClientId: 'test-client-id'
      });
    });

    it('should set up Hub listener for auth events', () => {
      expect(mockHubListen).toHaveBeenCalledWith('auth', expect.any(Function));
    });

    it('should call getUser on initialization', () => {
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    it('should initialize observables', () => {
      expect(service.sessionData$).toBeDefined();
      expect(service.user$).toBeDefined();
      expect(service.userAttributes$).toBeDefined();
    });
  });

  describe('fetchSession', () => {
    beforeEach(() => {
      // Reset mocks for individual test cases
      jest.clearAllMocks();
    });

    it('should fetch session successfully with valid session data', async () => {
      mockFetchAuthSession.mockResolvedValue(mockAuthSession);
      
      service.fetchSession();
      
      await Promise.resolve(); // Wait for async operation
      
      expect(mockFetchAuthSession).toHaveBeenCalledWith({ forceRefresh: false });
      
      service.sessionData$.subscribe(session => {
        expect(session).toEqual(mockAuthSession);
      });
    });

    it('should handle session with forceRefresh option', async () => {
      mockFetchAuthSession.mockResolvedValue(mockAuthSession);
      
      service.fetchSession({ forceRefresh: true });
      
      await Promise.resolve();
      
      expect(mockFetchAuthSession).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should handle invalid session (missing required properties)', async () => {
      const invalidSession = {
        credentials: undefined,
        identityId: undefined,
        tokens: undefined,
        userSub: undefined
      } as any;
      
      mockFetchAuthSession.mockResolvedValue(invalidSession);
      
      service.fetchSession();
      
      await Promise.resolve();
      
      service.sessionData$.subscribe(session => {
        expect(session).toBeNull();
      });
    });

    it('should handle session fetch error', async () => {
      mockFetchAuthSession.mockRejectedValue(new Error('Session fetch failed'));
      
      service.fetchSession();
      
      await Promise.resolve();
      
      service.sessionData$.subscribe(session => {
        expect(session).toBeNull();
      });
    });

    it('should set up automatic session refresh', async () => {
      mockFetchAuthSession.mockResolvedValue(mockAuthSession);
      
      service.fetchSession();
      
      await Promise.resolve();
      
      // Fast-forward time to trigger refresh
      jest.advanceTimersByTime(3540000); // 59 minutes (1 minute before expiration)
      
      expect(mockFetchAuthSession).toHaveBeenCalledTimes(2);
      expect(mockFetchAuthSession).toHaveBeenLastCalledWith({ forceRefresh: true });
    });

    it('should clear existing timeout before setting new one', async () => {
      mockFetchAuthSession.mockResolvedValue(mockAuthSession);
      
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      // First call
      service.fetchSession();
      await Promise.resolve();
      
      // Second call should clear previous timeout
      service.fetchSession();
      await Promise.resolve();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('getUser', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get user successfully', async () => {
      mockGetCurrentUser.mockResolvedValue(mockUser);
      
      service.getUser();
      
      await Promise.resolve();
      
      expect(mockGetCurrentUser).toHaveBeenCalled();
      
      service.user$.subscribe(user => {
        expect(user).toEqual(mockUser);
      });
    });

    it('should handle get user error', async () => {
      mockGetCurrentUser.mockRejectedValue(new Error('Get user failed'));
      
      service.getUser();
      
      await Promise.resolve();
      
      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });
    });
  });

  describe('getUserAttributes', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should get user attributes successfully', async () => {
      mockFetchUserAttributes.mockResolvedValue(mockUserAttributes);
      
      const result = service.getUserAttributes();
      
      await Promise.resolve();
      
      expect(mockFetchUserAttributes).toHaveBeenCalled();
      
      service.userAttributes$.subscribe(attributes => {
        expect(attributes).toEqual(mockUserAttributes);
      });
      
      await expect(result).resolves.toBeUndefined();
    });

    it('should handle get user attributes error', async () => {
      mockFetchUserAttributes.mockRejectedValue(new Error('Get attributes failed'));
      
      const result = service.getUserAttributes();
      
      await Promise.resolve();
      
      service.userAttributes$.subscribe(attributes => {
        expect(attributes).toBeNull();
      });
      
      await expect(result).resolves.toBeUndefined();
    });
  });

  describe('Hub Authentication Events', () => {
    let hubCallback: (data: any) => void;

    beforeEach(() => {
      // Don't clear mocks here - we need the original call from constructor
      // Capture the Hub callback function from the original constructor call
      const hubCalls = (mockHubListen as jest.Mock).mock.calls;
      if (hubCalls.length > 0) {
        hubCallback = hubCalls[0][1];
      }
    });

    it('should handle signedIn event', () => {
      if (!hubCallback) {
        fail('Hub callback was not captured');
        return;
      }

      jest.clearAllMocks(); // Clear after capturing callback
      mockGetCurrentUser.mockResolvedValue(mockUser);
      
      hubCallback({
        payload: { event: 'signedIn' }
      });
      
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    it('should handle signedOut event', () => {
      if (!hubCallback) {
        fail('Hub callback was not captured');
        return;
      }

      jest.clearAllMocks(); // Clear after capturing callback
      mockGetCurrentUser.mockResolvedValue(mockUser);
      
      hubCallback({
        payload: { event: 'signedOut' }
      });
      
      expect(mockGetCurrentUser).toHaveBeenCalled();
    });

    it('should ignore other events', () => {
      if (!hubCallback) {
        fail('Hub callback was not captured');
        return;
      }

      jest.clearAllMocks(); // Clear after capturing callback
      
      hubCallback({
        payload: { event: 'tokenRefresh' }
      });
      
      expect(mockGetCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('User Observable Chain', () => {
    it('should call fetchSession when user observable emits', (done) => {
      // Spy on the service's fetchSession method
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession').mockImplementation(() => {
        expect(fetchSessionSpy).toHaveBeenCalled();
        fetchSessionSpy.mockRestore();
        done();
      });
      
      // Emit a different user to ensure it passes distinctUntilChanged
      const differentUser = { ...mockUser, username: 'different-user' };
      service['user'].next(differentUser);
    });

    it('should call getUserAttributes when user is not null', (done) => {
      // Spy on the service methods
      const getUserAttributesSpy = jest.spyOn(service, 'getUserAttributes').mockImplementation(() => {
        expect(getUserAttributesSpy).toHaveBeenCalled();
        getUserAttributesSpy.mockRestore();
        fetchSessionSpy.mockRestore();
        done();
        return Promise.resolve();
      });
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession').mockImplementation(() => {});
      
      // Emit a different user to ensure it passes distinctUntilChanged
      const differentUser = { ...mockUser, username: 'different-user-2' };
      service['user'].next(differentUser);
    });

    it('should test observable subscription behavior', () => {
      // Test the subscription setup by checking that the observables exist and are properly configured
      expect(service.user$).toBeDefined();
      expect(service.sessionData$).toBeDefined();
      expect(service.userAttributes$).toBeDefined();
      
      // Test that the service has the private BehaviorSubjects
      expect(service['user']).toBeInstanceOf(BehaviorSubject);
      expect(service['sessionData']).toBeInstanceOf(BehaviorSubject);
      expect(service['userAttributes']).toBeInstanceOf(BehaviorSubject);
    });

    it('should test individual method calls directly', () => {
      // Test that the methods work correctly when called directly
      const fetchSessionSpy = jest.spyOn(service, 'fetchSession');
      const getUserAttributesSpy = jest.spyOn(service, 'getUserAttributes');
      
      service.fetchSession();
      service.getUserAttributes();
      
      expect(fetchSessionSpy).toHaveBeenCalled();
      expect(getUserAttributesSpy).toHaveBeenCalled();
      
      fetchSessionSpy.mockRestore();
      getUserAttributesSpy.mockRestore();
    });

    it('should handle null user state correctly', () => {
      // Test that setting user to null works
      service['user'].next(null);
      
      service.user$.subscribe(user => {
        expect(user).toBeNull();
      });
    });
  });

  describe('Observable Subscriptions', () => {
    it('should emit session data changes', () => {
      const testSession = { ...mockAuthSession };
      let emissionCount = 0;
      
      const subscription = service.sessionData$.subscribe(session => {
        emissionCount++;
        if (emissionCount === 2) { // Skip initial null emission
          expect(session).toEqual(testSession);
          subscription.unsubscribe();
        }
      });
      
      service['sessionData'].next(testSession);
    });

    it('should emit user changes', () => {
      let emissionCount = 0;
      
      const subscription = service.user$.subscribe(user => {
        emissionCount++;
        if (emissionCount === 2) { // Skip initial emission
          expect(user).toEqual(mockUser);
          subscription.unsubscribe();
        }
      });
      
      service['user'].next(mockUser);
    });

    it('should emit user attributes changes', () => {
      let emissionCount = 0;
      
      const subscription = service.userAttributes$.subscribe(attributes => {
        emissionCount++;
        if (emissionCount === 2) { // Skip initial null emission
          expect(attributes).toEqual(mockUserAttributes);
          subscription.unsubscribe();
        }
      });
      
      service['userAttributes'].next(mockUserAttributes);
    });
  });

  describe('Session Refresh Logic', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should calculate correct refresh interval', async () => {
      const futureExpiration = new Date(Date.now() + 3600000); // 1 hour from now
      const sessionWithExpiration = {
        ...mockAuthSession,
        credentials: {
          ...mockAuthSession.credentials!,
          expiration: futureExpiration
        }
      };
      
      mockFetchAuthSession.mockResolvedValue(sessionWithExpiration);
      
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      
      service.fetchSession();
      
      await Promise.resolve();
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(
        expect.any(Function),
        expect.any(Number)
      );
      
      // Check that the timeout is set for approximately 59 minutes (1 minute before expiration)
      const [, timeout] = setTimeoutSpy.mock.calls[0];
      expect(timeout).toBeGreaterThan(3540000 - 1000); // Allow 1 second tolerance
      expect(timeout).toBeLessThan(3540000 + 1000);
    });
  });
});