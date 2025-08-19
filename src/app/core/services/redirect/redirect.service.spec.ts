import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Injector, Signal, WritableSignal, computed, effect, signal, ApplicationRef } from '@angular/core';
import { RedirectService } from './redirect.service';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';
import { Router } from '@angular/router';

// Mock afterNextRender to run synchronously
jest.mock('@angular/core', () => ({
  ...jest.requireActual('@angular/core'),
  afterNextRender: (cb: () => void) => cb(),
}));

describe('RedirectService', () => {
  let service: RedirectService;
  let mockAuthService: { user: WritableSignal<any> };
  let mockDeviceService: { usbConnectionStatus: WritableSignal<boolean> };
  let mockRouter: { url: string; navigate: jest.Mock };
  let injector: Injector;
  let consoleSpy: jest.SpyInstance;
  let applicationRef: ApplicationRef;

  beforeEach(() => {
    // Create signals for user and USB connection
    mockAuthService = { user: signal<any>(null) };
    mockDeviceService = { usbConnectionStatus: signal(false) };
    mockRouter = {
      url: '/index',
      navigate: jest.fn().mockResolvedValue(true)
    };
    injector = {} as Injector;
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    TestBed.configureTestingModule({
      providers: [
        RedirectService,
        { provide: AuthService, useValue: mockAuthService },
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: Router, useValue: mockRouter }
        // Removed custom Injector provider
      ]
    });
    // Instantiate service in DI context
    service = TestBed.runInInjectionContext(() => TestBed.inject(RedirectService));
    applicationRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    mockAuthService.user.set(null);
    mockDeviceService.usbConnectionStatus.set(false);
    mockRouter.url = '/index';
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('redirect logic', () => {
    it('redirects to /index if not authenticated and not on /index', fakeAsync(() => {
      mockRouter.url = '/device';
      mockAuthService.user.set(null);
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/device');
      expect(consoleSpy).toHaveBeenCalledWith('Session expired, redirecting to /index');
    }));

    it('does not redirect if not authenticated and already on /index', fakeAsync(() => {
      mockRouter.url = '/index';
      mockAuthService.user.set(null);
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));

    it('redirects to /device if authenticated, USB connected, not on /device', fakeAsync(() => {
      mockRouter.url = '/index';
      mockAuthService.user.set({ id: '1' });
      mockDeviceService.usbConnectionStatus.set(true);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/index');
      expect(consoleSpy).toHaveBeenCalledWith('User authenticated and USB connected, redirecting to /device');
    }));

    it('does not redirect if authenticated, USB connected, already on /device', fakeAsync(() => {
      mockRouter.url = '/device';
      mockAuthService.user.set({ id: '1' });
      mockDeviceService.usbConnectionStatus.set(true);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));

    it('redirects to /device if authenticated, no USB, on /index', fakeAsync(() => {
      mockRouter.url = '/index';
      mockAuthService.user.set({ id: '1' });
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/index');
      expect(consoleSpy).toHaveBeenCalledWith('User authenticated but no USB connected, could redirect to profile or stay');
    }));

    it('does not redirect if authenticated, no USB, not on /index', fakeAsync(() => {
      mockRouter.url = '/profile';
      mockAuthService.user.set({ id: '1' });
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('navigateWithDelay', () => {
    it('calls router.navigate with the target', fakeAsync(() => {
      service['navigateWithDelay'](['/test']);
      tick(); // Allow afterNextRender to complete
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/test']);
    }));
  });

  describe('reactivity', () => {
    it('reacts to user and USB changes', fakeAsync(() => {
      mockRouter.url = '/device';
      mockAuthService.user.set(null);
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
      jest.clearAllMocks();
      mockAuthService.user.set({ id: '1' });
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      mockAuthService.user.set(null);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
    }));

    it('reacts to USB connection changes', fakeAsync(() => {
      mockRouter.url = '/index';
      mockAuthService.user.set({ id: '1' });
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
      jest.clearAllMocks();
      mockDeviceService.usbConnectionStatus.set(true);
      applicationRef.tick(); // Trigger effects
      tick(); // Allow async operations to complete
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
    }));
  });
});