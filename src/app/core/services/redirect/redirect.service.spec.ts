import { AuthSession } from 'aws-amplify/auth';

import { TestBed,
         fakeAsync,
         tick } from '@angular/core/testing';
import { Injector,
         WritableSignal,
         signal,
         ApplicationRef } from '@angular/core';
import { Router } from '@angular/router';

import { RedirectService } from './redirect.service';
import { AuthService } from '@services/auth/auth.service';
import { DeviceService } from '@services/device/device.service';


jest.mock('@angular/core', () => ({
  ...jest.requireActual('@angular/core'),
  afterNextRender: (cb: () => void) => cb(),
}));

describe('RedirectService', () => {

  let service: RedirectService;
  let mockAuthService: { sessionData: WritableSignal<Nullable<AuthSession>> };
  let mockDeviceService: { usbConnectionStatus: WritableSignal<boolean> };
  let mockRouter: { url: string; navigate: jest.Mock };
  let injector: Injector;
  let consoleSpy: jest.SpyInstance;
  let applicationRef: ApplicationRef;

  const createMockSession = (): AuthSession => ({
    tokens: {
      accessToken: {
        toString: () => 'mock-access-token',
        payload: {
          sub: '1',
          exp: 0,
          iat: 0,
          token_use: 'access',
          scope: '',
          auth_time: 0,
          iss: '',
          client_id: '',
          origin_jti: '',
          event_id: '',
          jti: '',
          username: 'testuser'
        }
      }
    }
  } as AuthSession);

  beforeEach(() => {
    mockAuthService = { sessionData: signal<Nullable<AuthSession>>(null) };
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
      ]
    });
    service = TestBed.runInInjectionContext(() => TestBed.inject(RedirectService));
    applicationRef = TestBed.inject(ApplicationRef);
  });

  afterEach(() => {
    mockAuthService.sessionData.set(null);
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
      mockAuthService.sessionData.set(null);
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/device');
      expect(consoleSpy).toHaveBeenCalledWith('Session expired, redirecting to /index');
    }));

    it('does not redirect if not authenticated and already on /index', fakeAsync(() => {
      mockRouter.url = '/index';
      mockAuthService.sessionData.set(null);
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));

    it('redirects to /device if authenticated, USB connected, not on /device', fakeAsync(() => {
      mockRouter.url = '/dashboard';
      mockAuthService.sessionData.set(createMockSession());
      mockDeviceService.usbConnectionStatus.set(true);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/dashboard');
      expect(consoleSpy).toHaveBeenCalledWith('User authenticated and USB connected, redirecting to /device');
    }));

    it('does not redirect if authenticated, USB connected, already on /device', fakeAsync(() => {
      mockRouter.url = '/device';
      mockAuthService.sessionData.set(createMockSession());
      mockDeviceService.usbConnectionStatus.set(true);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));

    it('redirects to /device if authenticated, no USB, on /index', fakeAsync(() => {
      mockRouter.url = '/index';
      mockAuthService.sessionData.set(createMockSession());
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
      expect(consoleSpy).toHaveBeenCalledWith('Redirect service: current url: ', '/index');
      expect(consoleSpy).toHaveBeenCalledWith('User authenticated but no USB connected, could redirect to profile or stay');
    }));

    it('does not redirect if authenticated, no USB, not on /index', fakeAsync(() => {
      mockRouter.url = '/dashboard';
      mockAuthService.sessionData.set(createMockSession());
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    }));
  });

  describe('navigateWithDelay', () => {
    it('calls router.navigate with the target', fakeAsync(() => {
      service['navigateWithDelay'](['/test']);
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/test']);
    }));
  });

  describe('reactivity', () => {
    it('reacts to user and USB changes', fakeAsync(() => {
      mockRouter.url = '/device';
      mockAuthService.sessionData.set(null);
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
      jest.clearAllMocks();
      mockAuthService.sessionData.set(createMockSession());
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      mockAuthService.sessionData.set(null);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
    }));

    it('reacts to USB connection changes', fakeAsync(() => {
      mockRouter.url = '/dashboard';
      mockAuthService.sessionData.set(createMockSession());
      mockDeviceService.usbConnectionStatus.set(false);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      jest.clearAllMocks();
      mockDeviceService.usbConnectionStatus.set(true);
      applicationRef.tick();
      tick();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
    }));
  });

});