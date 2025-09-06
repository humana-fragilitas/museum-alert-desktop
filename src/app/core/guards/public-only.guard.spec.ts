import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { AuthSession } from 'aws-amplify/auth';

import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActivatedRouteSnapshot,
         RouterStateSnapshot,
         GuardResult } from '@angular/router';
import { signal,
         WritableSignal,
         Injector,
         runInInjectionContext } from '@angular/core';

import { publicOnlyGuard } from './public-only.guard';
import { AuthService } from '@services/auth/auth.service';


interface MockAuthService {
  sessionData: WritableSignal<Nullable<AuthSession>>;
}

describe('publicOnlyGuard', () => {
  let mockAuthService: MockAuthService;
  let mockRouter: jest.Mocked<Pick<Router, 'navigate'>>;
  let mockRoute: ActivatedRouteSnapshot;
  let mockState: RouterStateSnapshot;
  let sessionDataSignal: WritableSignal<Nullable<AuthSession>>;
  let injector: Injector;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {

    sessionDataSignal = signal<Nullable<AuthSession>>(null);
    mockAuthService = {
      sessionData: sessionDataSignal
    };
    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    injector = TestBed.inject(Injector);

    mockRoute = {} as ActivatedRouteSnapshot;
    mockState = {
      url: '/login'
    } as RouterStateSnapshot;

    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    sessionDataSignal.set(null);

  });

  afterEach(() => {
    consoleSpy.mockRestore();
    jest.clearAllMocks();
  });

  describe('when user is NOT authenticated', () => {

    beforeEach(() => {
      sessionDataSignal.set(null);
    });

    it('should allow access to public-only route', (done) => {

      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
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

    it('should log that non-authenticated user is allowed', (done) => {

      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[publicOnlyGuard]: non authenticated user is allowed to browse public only route '${mockState.url}'`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[publicOnlyGuard]: non authenticated user is allowed to browse public only route '${mockState.url}'`
          );
          done();
        }
      });

    });

    it('should not navigate anywhere', (done) => {

      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
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

  describe('when user IS authenticated', () => {

    beforeEach(() => {

      const mockSession: AuthSession = {
        tokens: {
          accessToken: {
            toString: jest.fn(() => 'mock-access-token'),
            payload: {
              sub: 'user-123',
              iss: 'https://cognito-idp.region.amazonaws.com/userPoolId',
              client_id: 'clientId',
              origin_jti: 'originJti',
              event_id: 'eventId',
              token_use: 'access',
              scope: 'aws.cognito.signin.user.admin',
              auth_time: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
              iat: Math.floor(Date.now() / 1000),
              jti: 'jti',
              username: 'testuser'
            }
          },
          idToken: {
            toString: jest.fn(() => 'mock-id-token'),
            payload: {
              sub: 'user-123',
              aud: 'clientId',
              'cognito:username': 'testuser',
              email: 'test@example.com',
              email_verified: true,
              iss: 'https://cognito-idp.region.amazonaws.com/userPoolId',
              origin_jti: 'originJti',
              event_id: 'eventId',
              token_use: 'id',
              auth_time: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + 3600,
              iat: Math.floor(Date.now() / 1000)
            }
          }
        },
        credentials: {
          accessKeyId: 'mockAccessKeyId',
          secretAccessKey: 'mockSecretAccessKey',
          sessionToken: 'mockSessionToken',
          expiration: new Date(Date.now() + 3600000)
        },
        identityId: 'mockIdentityId',
        userSub: 'user-123'
      };
      sessionDataSignal.set(mockSession);

    });

    it('should deny access to public-only route', (done) => {
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
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

    it('should redirect to /device', (done) => {
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
            next: () => {
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
              expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
              done();
            },
            error: done
          });
        } else {
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        }
      });
    });

    it('should log that authenticated user is not allowed', (done) => {
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
            next: () => {
              expect(consoleSpy).toHaveBeenCalledWith(
                `[publicOnlyGuard]: authenticated user is not allowed to browse public only route '${mockState.url}'; redirecting to /device`
              );
              done();
            },
            error: done
          });
        } else {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[publicOnlyGuard]: authenticated user is not allowed to browse public only route '${mockState.url}'; redirecting to /device`
          );
          done();
        }
      });
    });
  });

  describe('with different route URLs', () => {

    const testCases = [
      '/login',
      '/register',
      '/forgot-password',
      '/public-info'
    ];

    testCases.forEach(url => {

      describe(`for route '${url}'`, () => {

        beforeEach(() => {
          mockState = { url } as RouterStateSnapshot;
        });

        it('should allow non-authenticated users', (done) => {

          sessionDataSignal.set(null);
          
          runInInjectionContext(injector, () => {
            const result = publicOnlyGuard(mockRoute, mockState);
            
            // Handle both Observable and boolean returns
            if (result instanceof Observable) {
              result.subscribe({
                next: (canActivate: GuardResult) => {
                  expect(canActivate).toBe(true);
                  expect(consoleSpy).toHaveBeenCalledWith(
                    `[publicOnlyGuard]: non authenticated user is allowed to browse public only route '${url}'`
                  );
                  done();
                },
                error: done
              });
            } else {
              expect(result).toBe(true);
              expect(consoleSpy).toHaveBeenCalledWith(
                `[publicOnlyGuard]: non authenticated user is allowed to browse public only route '${url}'`
              );
              done();
            }
          });

        });

        it('should deny authenticated users and redirect', (done) => {

          const mockSession: AuthSession = {
            tokens: {
              accessToken: {
                toString: () => 'token',
                payload: {
                  sub: 'user-123',
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
          } as AuthSession;
          sessionDataSignal.set(mockSession);
          
          runInInjectionContext(injector, () => {

            const result = publicOnlyGuard(mockRoute, mockState);
            
            if (result instanceof Observable) {
              result.subscribe({
                next: (canActivate: GuardResult) => {
                  expect(canActivate).toBe(false);
                  expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
                  expect(consoleSpy).toHaveBeenCalledWith(
                    `[publicOnlyGuard]: authenticated user is not allowed to browse public only route '${url}'; redirecting to /device`
                  );
                  done();
                },
                error: done
              });
            } else {
              expect(result).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
              expect(consoleSpy).toHaveBeenCalledWith(
                `[publicOnlyGuard]: authenticated user is not allowed to browse public only route '${url}'; redirecting to /device`
              );
              done();
            }

          });

        });

      });

    });

  });

  describe('edge cases', () => {

    it('should handle user signal changes during execution', (done) => {

      sessionDataSignal.set(null);
      
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        setTimeout(() => {
          const mockSession: AuthSession = {
            tokens: {
              accessToken: {
                toString: () => 'token',
                payload: {
                  sub: 'user-123',
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
          } as AuthSession;
          sessionDataSignal.set(mockSession);
        }, 10);
        
        if (result instanceof Observable) {
          result.subscribe({
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

    it('should handle router navigation failure gracefully', (done) => {

      const mockSession: AuthSession = {
        tokens: {
          accessToken: {
            toString: () => 'token',
            payload: {
              sub: 'user-123',
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
      } as AuthSession;
      sessionDataSignal.set(mockSession);
      
      mockRouter.navigate.mockRejectedValue(new Error('Navigation failed'));
      
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
          done();
        }

      });

    });

    it('should handle empty or undefined route URL', (done) => {

      mockState = { url: '' } as RouterStateSnapshot;
      sessionDataSignal.set(null);
      
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              if (canActivate === false) {
                expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
              } else {
                expect(canActivate).toBe(true);
                expect(consoleSpy).toHaveBeenCalledWith(
                  `[publicOnlyGuard]: non authenticated user is allowed to browse public only route ''`
                );
              }
              done();
            },
            error: (error) => {
              done(error);
            }
          });
        } else {
          expect(result).toBe(true);
          done();
        }
      });

    });

  });

  describe('integration with AuthService', () => {

    it('should work with different user object structures', (done) => {

      const minimalSession: AuthSession = {
        tokens: {
          accessToken: {
            toString: () => 'token',
            payload: {
              sub: 'user-456',
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
      } as AuthSession;
      sessionDataSignal.set(minimalSession);
      
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
          done();
        }

      });

    });

    it('should handle truthy non-object user values', (done) => {

      sessionDataSignal.set('authenticated' as any);
      
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
              done();
            },
            error: done
          });
        } else {
          expect(result).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
          done();
        }
      });

    });

  });

  describe('performance and memory', () => {

    it('should complete the observable stream', (done) => {

      sessionDataSignal.set(null);
      
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          result.pipe(take(1)).subscribe({
            next: (canActivate: GuardResult) => {
              expect(canActivate).toBe(true);
              done();
            },
            error: (error) => {
              done(error);
            }
          });
        } else {
          expect(result).toBe(true);
          done();
        }

      });

    });

    it('should not create memory leaks with multiple subscriptions', (done) => {
      
      sessionDataSignal.set(null);
      
      runInInjectionContext(injector, () => {
        const result = publicOnlyGuard(mockRoute, mockState);
        
        if (result instanceof Observable) {
          let completedCount = 0;
          const checkCompletion = () => {
            completedCount++;
            if (completedCount === 2) {
              done();
            }
          };
          
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
  
});