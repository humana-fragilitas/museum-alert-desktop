import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { BehaviorSubject, Subscription } from 'rxjs';
import { RedirectService } from './redirect.service';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';

// Mock both afterNextRender and runInInjectionContext at the module level
jest.mock('@angular/core', () => ({
  ...jest.requireActual('@angular/core'),
  afterNextRender: (callback: () => void) => {
    // Execute callback immediately in tests
    setTimeout(callback, 0);
  },
  runInInjectionContext: (_injector: any, callback: () => void) => {
    // Execute callback directly in tests without injector validation
    callback();
  }
}));

describe('RedirectService', () => {
  let service: RedirectService;
  let mockAuthService: Partial<AuthService>;
  let mockDeviceService: Partial<DeviceService>;
  let mockRouter: Partial<Router>;
  let subscription: Subscription;

  // Create BehaviorSubjects for reactive streams
  const userSubject = new BehaviorSubject<any>(null);
  const usbConnectionStatusSubject = new BehaviorSubject<boolean>(false);

  beforeEach(() => {
    // Create mock services
    mockAuthService = {
      user$: userSubject.asObservable()
    };

    mockDeviceService = {
      usbConnectionStatus$: usbConnectionStatusSubject.asObservable()
    };

    mockRouter = {
      url: '/index',
      navigate: jest.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        RedirectService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(RedirectService);
  });

  afterEach(() => {
    // Reset subjects to clean state
    userSubject.next(null);
    usbConnectionStatusSubject.next(false);
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('redirect logic', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should redirect to /index when user is not authenticated and not on index page', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/device', writable: true });
      
      // Act
      userSubject.next(null);
      usbConnectionStatusSubject.next(false);

      // Wait for afterNextRender to execute
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
    });

    it('should not redirect when user is not authenticated and already on index page', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/index', writable: true });
      
      // Act
      userSubject.next(null);
      usbConnectionStatusSubject.next(false);

      // Wait for potential navigation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to /device when user is authenticated, USB connected, and not on device page', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/index', writable: true });
      const mockUser = { id: '123', name: 'Test User' };
      
      // Act
      userSubject.next(mockUser);
      usbConnectionStatusSubject.next(true);

      // Wait for afterNextRender to execute
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
    });

    it('should not redirect when user is authenticated, USB connected, and already on device page', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/device', writable: true });
      const mockUser = { id: '123', name: 'Test User' };
      
      // Act
      userSubject.next(mockUser);
      usbConnectionStatusSubject.next(true);

      // Wait for potential navigation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('should redirect to /device when user is authenticated, no USB connection, and on index page', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/index', writable: true });
      const mockUser = { id: '123', name: 'Test User' };
      
      // Act
      userSubject.next(mockUser);
      usbConnectionStatusSubject.next(false);

      // Wait for afterNextRender to execute
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
    });

    it('should not redirect when user is authenticated, no USB connection, and not on index page', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/profile', writable: true });
      const mockUser = { id: '123', name: 'Test User' };
      
      // Act
      userSubject.next(mockUser);
      usbConnectionStatusSubject.next(false);

      // Wait for potential navigation
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('navigateWithDelay method', () => {
    it('should call router.navigate with correct parameters', async () => {
      // Arrange
      const targetRoute = ['/test-route'];
      
      // Act
      service['navigateWithDelay'](targetRoute);
      
      // Wait for afterNextRender to execute
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(targetRoute);
    });
  });

  describe('reactive behavior', () => {
    it('should react to user authentication changes', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/device', writable: true });
      
      // Reset to clean state first
      userSubject.next(null);
      usbConnectionStatusSubject.next(false);
      
      // Wait for any initial navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      jest.clearAllMocks(); // Clear any initial navigation calls
      
      // Act - user logs in (this changes the combination)
      userSubject.next({ id: '123' });
      
      // Wait and verify no navigation happened (authenticated user on /device should stay)
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      
      // Now user logs out (this should trigger navigation)
      userSubject.next(null);
      
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
    });

    it('should react to USB connection status changes', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/index', writable: true });
      const mockUser = { id: '123', name: 'Test User' };
      
      // Set initial clean state
      userSubject.next(null);
      usbConnectionStatusSubject.next(false);
      
      // Wait for initial processing and clear
      await new Promise(resolve => setTimeout(resolve, 50));
      jest.clearAllMocks();
      
      // Act - User logs in with no USB
      userSubject.next(mockUser);
      
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
      
      // Clear mock and change URL
      jest.clearAllMocks();
      Object.defineProperty(mockRouter, 'url', { value: '/profile', writable: true });
      
      // Act - USB gets connected
      usbConnectionStatusSubject.next(true);
      
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Assert
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
    });

    it('should handle multiple emissions correctly', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/device', writable: true });
      
      // Start fresh - ensure we're starting from a known state
      userSubject.next({ id: '123' });
      usbConnectionStatusSubject.next(false);
      
      // Wait for any initial processing
      await new Promise(resolve => setTimeout(resolve, 50));
      jest.clearAllMocks(); // Clear any calls from setup
      
      // Act - Change user to null (this should trigger navigation)
      userSubject.next(null);
      
      // Wait for navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
      
      // Clear the mock to reset call count
      jest.clearAllMocks();
      
      // Act - Change USB status (this creates a new emission even with same user)
      usbConnectionStatusSubject.next(true);
      
      // Wait to see if navigation is called
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Since user is null and USB is now true, and URL is '/device',
      // this should still trigger navigation to /index (first condition in the service)
      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
    });

    it('should demonstrate distinctUntilChanged behavior with reference equality', async () => {
      // Note: distinctUntilChanged() without a custom comparator uses reference equality
      // for arrays, so each emission from combineLatest creates a new array and will 
      // pass through distinctUntilChanged even if the contents are the same
      
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/device', writable: true });
      
      // Set a state that should trigger navigation
      userSubject.next(null);
      usbConnectionStatusSubject.next(false);
      
      // Wait for first navigation
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(mockRouter.navigate).toHaveBeenCalled();
      jest.clearAllMocks();
      
      // Re-emit the same logical values by updating one observable
      // This creates a new array emission [null, false] even though values are same
      usbConnectionStatusSubject.next(false); // Same value, but triggers new emission
      
      // Wait to see if navigation is called again
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // This WILL trigger navigation again because distinctUntilChanged uses reference equality
      // and combineLatest creates a new array [null, false] which is a different reference
      expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
    });
  });

  describe('console logging', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log session expiry redirect', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/device', writable: true });
      
      // Act
      userSubject.next(null);
      usbConnectionStatusSubject.next(false);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/device');
      expect(consoleSpy).toHaveBeenCalledWith('Session expired, redirecting to /index');
    });

    it('should log USB connection redirect', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/index', writable: true });
      const mockUser = { id: '123', name: 'Test User' };
      
      // Act
      userSubject.next(mockUser);
      usbConnectionStatusSubject.next(true);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/index');
      expect(consoleSpy).toHaveBeenCalledWith('User authenticated and USB connected, redirecting to /device');
    });

    it('should log authenticated user without USB redirect', async () => {
      // Arrange
      Object.defineProperty(mockRouter, 'url', { value: '/index', writable: true });
      const mockUser = { id: '123', name: 'Test User' };
      
      // Act
      userSubject.next(mockUser);
      usbConnectionStatusSubject.next(false);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 50));

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/index');
      expect(consoleSpy).toHaveBeenCalledWith('User authenticated but no USB connected, could redirect to profile or stay');
    });
  });
});