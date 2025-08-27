import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot, GuardResult } from '@angular/router';
import { signal, WritableSignal, Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { userSessionGuard } from './user-session.guard';
import { AuthService } from '@services/auth/auth.service';
import { AuthSession } from 'aws-amplify/auth';

// Mock AuthService interface
interface MockAuthService {
  sessionData: WritableSignal<Nullable<AuthSession>>;
}

describe('userSessionGuard', () => {
  let mockAuthService: MockAuthService;
  let mockRouter: jest.Mocked<Pick<Router, 'navigate'>>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let sessionDataSignal: WritableSignal<Nullable<AuthSession>>;
  let injector: Injector;

  // Console spy to test logging behavior
  let consoleSpy: jest.SpyInstance;

  // Mock session object
  const mockSession: AuthSession = {
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
      } as any,
      idToken: { 
        toString: () => 'id',
        payload: {}
      } as any
    },
    userSub: 'sub'
  };

  beforeEach(() => {
    // Create writable signal for session data
    sessionDataSignal = signal<Nullable<AuthSession>>(null);

    // Create mock AuthService
    mockAuthService = {
      sessionData: sessionDataSignal
    };

    // Create mock Router with only navigate method
    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    // Setup TestBed with mocked dependencies
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    // Get the injector for running tests in injection context
    injector = TestBed.inject(Injector);

    // Create mock route and state
    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {
      url: '/dashboard'
    } as RouterStateSnapshot;

    // Setup console spy
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    // Ensure clean state
    sessionDataSignal.set(null);
  });

  afterEach(() => {
    // Restore console and clear all mocks
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('when user IS authenticated', () => {
    beforeEach(() => {
      // Set session signal to authenticated session
      sessionDataSignal.set(mockSession);
    });

    it('should allow access to private route', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(true);
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(true);
          done();
        }
      });
    });

    it('should log correct message for authenticated access', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is allowed to browse private only route '/dashboard'`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[userSessionGuard]: authenticated user is allowed to browse private only route '/dashboard'`
          );
          done();
        }
      });
    });
  });

  describe('when user IS NOT authenticated', () => {
    beforeEach(() => {
      // Set session signal to null (not authenticated)
      sessionDataSignal.set(null);
    });

    it('should deny access to private route', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(false);
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(false);
          done();
        }
      });
    });

    it('should redirect to /index when denying access', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
              done();
            },
            error: done
          });
        } else {
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
          done();
        }
      });
    });

    it('should log correct message for non-authenticated access', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is not allowed to browse private only route '/dashboard'; redirecting to /index`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[userSessionGuard]: authenticated user is not allowed to browse private only route '/dashboard'; redirecting to /index`
          );
          done();
        }
      });
    });
  });

  describe('edge cases', () => {
    it('should handle router navigation failure gracefully', (done) => {
      sessionDataSignal.set(null);
      mockRouter.navigate.mockRejectedValueOnce(new Error('Navigation failed'));

      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(false);
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(false);
          done();
        }
      });
    });

    it('should handle empty route URL', (done) => {
      sessionDataSignal.set(null);
      mockState.url = '';

      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is not allowed to browse private only route ''; redirecting to /index`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[userSessionGuard]: authenticated user is not allowed to browse private only route ''; redirecting to /index`
          );
          done();
        }
      });
    });
  });
});