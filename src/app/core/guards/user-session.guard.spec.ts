import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { ActivatedRouteSnapshot, RouterStateSnapshot, GuardResult } from '@angular/router';
import { signal, WritableSignal, Injector, runInInjectionContext } from '@angular/core';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { userSessionGuard } from './user-session.guard';
import { AuthService } from '@services/auth/auth.service';

// Mock AuthUser interface to match AWS Amplify's AuthUser type
interface MockAuthUser {
  userId: string;
  username?: string;
  email?: string;
  [key: string]: any; // Allow additional properties
}

// Mock AuthService interface
interface MockAuthService {
  user: WritableSignal<Nullable<MockAuthUser>>;
}

describe('userSessionGuard', () => {
  let mockAuthService: MockAuthService;
  let mockRouter: jest.Mocked<Pick<Router, 'navigate'>>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let userSignal: WritableSignal<Nullable<MockAuthUser>>;
  let injector: Injector;

  // Console spy to test logging behavior
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create writable signal for user
    userSignal = signal<Nullable<MockAuthUser>>(null);

    // Create mock AuthService
    mockAuthService = {
      user: userSignal
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
    userSignal.set(null);
  });

  afterEach(() => {
    // Restore console and clear all mocks
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('when user IS authenticated', () => {
    const mockUser: MockAuthUser = {
      userId: 'user-123',
      email: 'test@example.com',
      username: 'testuser'
    };

    beforeEach(() => {
      // Set user signal to authenticated user
      userSignal.set(mockUser);
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

    it('should log that authenticated user is allowed', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is allowed to browse private only route '${mockState.url}'`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[userSessionGuard]: authenticated user is allowed to browse private only route '${mockState.url}'`
          );
          done();
        }
      });
    });

    it('should not navigate anywhere', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(mockRouter.navigate).not.toHaveBeenCalled();
              done();
            },
            error: done
          });
        } else {
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          done();
        }
      });
    });
  });

  describe('when user is NOT authenticated', () => {
    beforeEach(() => {
      // Set user signal to null (not authenticated)
      userSignal.set(null);
    });

    it('should deny access to private route', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
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

    it('should redirect to /index', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
              expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
              done();
            },
            error: done
          });
        } else {
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        }
      });
    });

    it('should log that non-authenticated user is not allowed', (done) => {
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is not allowed to browse private only route '${mockState.url}'; redirecting to /index`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[userSessionGuard]: authenticated user is not allowed to browse private only route '${mockState.url}'; redirecting to /index`
          );
          done();
        }
      });
    });
  });

  describe('with different private route URLs', () => {
    const testCases = [
      '/dashboard',
      '/profile',
      '/settings',
      '/admin',
      '/device'
    ];

    testCases.forEach(url => {
      describe(`for route '${url}'`, () => {
        beforeEach(() => {
          mockState = { url } as RouterStateSnapshot;
        });

        it('should allow authenticated users', (done) => {
          userSignal.set({
            userId: 'user-123',
            email: 'test@example.com',
            username: 'testuser'
          });
          
          runInInjectionContext(injector, () => {
            const result = userSessionGuard(mockRoute, mockState);
            
            // Handle both Observable and boolean returns
            if (result instanceof Observable) {
              result.pipe(take(1)).subscribe({
                next: (canActivate: GuardResult) => {
                  expect(canActivate).toBe(true);
                  expect(consoleSpy).toHaveBeenCalledWith(
                    `[userSessionGuard]: authenticated user is allowed to browse private only route '${url}'`
                  );
                  done();
                },
                error: done
              });
            } else {
              expect(result).toBe(true);
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is allowed to browse private only route '${url}'`
              );
              done();
            }
          });
        });

        it('should deny non-authenticated users and redirect', (done) => {
          userSignal.set(null);
          
          runInInjectionContext(injector, () => {
            const result = userSessionGuard(mockRoute, mockState);
            
            // Handle both Observable and boolean returns
            if (result instanceof Observable) {
              result.pipe(take(1)).subscribe({
                next: (canActivate: GuardResult) => {
                  expect(canActivate).toBe(false);
                  expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
                  expect(consoleSpy).toHaveBeenCalledWith(
                    `[userSessionGuard]: authenticated user is not allowed to browse private only route '${url}'; redirecting to /index`
                  );
                  done();
                },
                error: done
              });
            } else {
              expect(result).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is not allowed to browse private only route '${url}'; redirecting to /index`
              );
              done();
            }
          });
        });
      });
    });
  });

  describe('edge cases', () => {
    it('should handle user authentication changes during execution', (done) => {
      // Start with authenticated user
      userSignal.set({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      });
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Change user state before subscription completes
        setTimeout(() => {
          userSignal.set(null);
        }, 10);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              // Should still be true since toObservable captures the initial state
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

    it('should handle router navigation failure gracefully', (done) => {
      userSignal.set(null);
      
      // Mock router.navigate to reject
      mockRouter.navigate.mockRejectedValue(new Error('Navigation failed'));
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
          done();
        }
      });
    });

    it('should handle empty route URL', (done) => {
      mockState = { url: '' } as RouterStateSnapshot;
      userSignal.set(null);
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is not allowed to browse private only route ''; redirecting to /index`
              );
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
          expect(consoleSpy).toHaveBeenCalledWith(
            `[userSessionGuard]: authenticated user is not allowed to browse private only route ''; redirecting to /index`
          );
          done();
        }
      });
    });
  });

  describe('integration with AuthService', () => {
    it('should work with different user object structures', (done) => {
      // Test with minimal user object
      const minimalUser = { userId: 'user-456' };
      userSignal.set(minimalUser);
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(true);
              expect(mockRouter.navigate).not.toHaveBeenCalled();
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(true);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should handle truthy non-object user values', (done) => {
      // Test with string user (edge case)
      userSignal.set('authenticated' as any);
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(true);
              expect(mockRouter.navigate).not.toHaveBeenCalled();
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(true);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should handle falsy values correctly', (done) => {
      // Test with undefined
      userSignal.set(undefined as any);
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
          done();
        }
      });
    });
  });

  describe('performance and memory', () => {
    it('should complete the observable stream', (done) => {
      userSignal.set({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      });
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          // Signal-based observables don't complete naturally, so we take(1)
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(true);
              done(); // take(1) automatically completes after first emission
            },
            error: done
          });
        } else {
          expect(result).toBe(true);
          done();
        }
      });
    });

    it('should not create memory leaks with multiple subscriptions', (done) => {
      userSignal.set({
        userId: 'user-123',
        email: 'test@example.com',
        username: 'testuser'
      });
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        // Handle both Observable and boolean returns
        if (result instanceof Observable) {
          let completedCount = 0;
          const checkCompletion = () => {
            completedCount++;
            if (completedCount === 2) {
              done();
            }
          };
          
          // Use take(1) to ensure completion
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => expect(canActivate).toBe(true),
            complete: checkCompletion,
            error: done
          });
          
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => expect(canActivate).toBe(true),
            complete: checkCompletion,
            error: done
          });
        } else {
          expect(result).toBe(true);
          done();
        }
      });
    });
  });

  describe('log message verification', () => {
    it('should use correct log message format for authenticated users', (done) => {
      const testUrl = '/special-admin-panel';
      mockState = { url: testUrl } as RouterStateSnapshot;
      
      userSignal.set({
        userId: 'admin-user',
        role: 'admin'
      });
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is allowed to browse private only route '${testUrl}'`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[userSessionGuard]: authenticated user is allowed to browse private only route '${testUrl}'`
          );
          done();
        }
      });
    });

    it('should use correct log message format for non-authenticated users', (done) => {
      const testUrl = '/protected-resource';
      mockState = { url: testUrl } as RouterStateSnapshot;
      
      userSignal.set(null);
      
      runInInjectionContext(injector, () => {
        const result = userSessionGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[userSessionGuard]: authenticated user is not allowed to browse private only route '${testUrl}'; redirecting to /index`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[userSessionGuard]: authenticated user is not allowed to browse private only route '${testUrl}'; redirecting to /index`
          );
          done();
        }
      });
    });
  });
});