import { TestBed } from '@angular/core/testing';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { userSessionGuard } from './user-session.guard';
import { AuthService } from '../services/auth/auth.service';

describe('userSessionGuard', () => {
  let mockAuthService: jest.Mocked<AuthService>;
  let mockRouter: jest.Mocked<Pick<Router, 'navigate'>>;
  let guard: CanActivateFn;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    // Create Jest mock objects for dependencies
    mockAuthService = {
      user$: of(null) // Default to no user
    } as jest.Mocked<AuthService>;
    
    // Mock only the Router methods we need
    mockRouter = {
      navigate: jest.fn()
    };

    // Spy on console.log to verify logging behavior
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    guard = (...guardParameters) =>
      TestBed.runInInjectionContext(() => userSessionGuard(...guardParameters));
  });

  afterEach(() => {
    // Clean up mocks
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  describe('when user is authenticated', () => {
    const mockUser = { id: '123', email: 'test@example.com' };

    beforeEach(() => {
      // Mock AuthService to return authenticated user
      (mockAuthService as any).user$ = of(mockUser);
    });

    it('should allow access to protected route', (done) => {
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((canActivate) => {
          expect(canActivate).toBe(true);
          done();
        });
      } else {
        fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
      }
    });

    it('should not navigate when allowing access', (done) => {
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          done();
        });
      } else {
        fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
      }
    });

    it('should log success message when user is authenticated', (done) => {
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          expect(consoleSpy).toHaveBeenCalledWith('User session valid, allowing access');
          done();
        });
      } else {
        fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
      }
    });

    it('should handle user with minimal properties', (done) => {
      const minimalUser = { id: '456' };
      (mockAuthService as any).user$ = of(minimalUser);
      
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((canActivate) => {
          expect(canActivate).toBe(true);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          done();
        });
      } else {
        fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
      }
    });
  });

  describe('when user is not authenticated', () => {
    beforeEach(() => {
      // Mock AuthService to return null user (not authenticated)
      (mockAuthService as any).user$ = of(null);
    });

    it('should deny access to protected route', (done) => {
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((canActivate) => {
          expect(canActivate).toBe(false);
          done();
        });
      } else {
        fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
      }
    });

    it('should redirect to /index when denying access', (done) => {
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
          expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
          done();
        });
      } else {
        fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
      }
    });

    it('should log redirect message when user is not authenticated', (done) => {
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          expect(consoleSpy).toHaveBeenCalledWith('No valid user session, redirecting to index');
          done();
        });
      } else {
        fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
      }
    });
  });

  describe('when user authentication state changes', () => {
    it('should handle authentication state changes correctly', (done) => {
      const mockUser = { id: '123', email: 'test@example.com' };
      
      // First call - user authenticated
      (mockAuthService as any).user$ = of(mockUser);
      
      const result1 = guard(null as any, null as any);
      
      if (result1 && typeof result1 === 'object' && 'subscribe' in result1) {
        result1.subscribe((canActivate) => {
          expect(canActivate).toBe(true);
          
          // Second call - user not authenticated
          (mockAuthService as any).user$ = of(null);
          
          const result2 = guard(null as any, null as any);
          
          if (result2 && typeof result2 === 'object' && 'subscribe' in result2) {
            result2.subscribe((canActivate2) => {
              expect(canActivate2).toBe(false);
              expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
              done();
            });
          } else {
            fail(`Expected guard to return an observable, but got: ${typeof result2} with value: ${result2}`);
          }
        });
      } else {
        // TO DO: check this
        fail('Expected Observable result');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle undefined user', (done) => {
      (mockAuthService as any).user$ = of(undefined);
      
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((canActivate) => {
          expect(canActivate).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
          expect(consoleSpy).toHaveBeenCalledWith('No valid user session, redirecting to index');
          done();
        });
      } else {
        fail('Expected Observable result');
      }
    });

    it('should handle empty object as user', (done) => {
      (mockAuthService as any).user$ = of({});
      
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe((canActivate) => {
          expect(canActivate).toBe(true);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          expect(consoleSpy).toHaveBeenCalledWith('User session valid, allowing access');
          done();
        });
      } else {
        fail('Expected Observable result');
      }
    });

    it('should handle falsy values correctly', () => {
      const falsyValues = [null, undefined, false, 0, '', NaN];
      
      return Promise.all(
        falsyValues.map((falsyValue) => {
          return new Promise<void>((resolve) => {
            (mockAuthService as any).user$ = of(falsyValue);
            
            const result = guard(null as any, null as any);
            
            if (result && typeof result === 'object' && 'subscribe' in result) {
              result.subscribe((canActivate) => {
                expect(canActivate).toBe(false);
                resolve();
              });
            } else {
              fail('Expected Observable result');
            }
          });
        })
      ).then(() => {
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/index']);
      });
    });
  });

  describe('console logging', () => {
    it('should log exactly once per guard execution', (done) => {
      const mockUser = { id: '123' };
      (mockAuthService as any).user$ = of(mockUser);
      
      const result = guard(null as any, null as any);
      
      if (result && typeof result === 'object' && 'subscribe' in result) {
        result.subscribe(() => {
          expect(consoleSpy).toHaveBeenCalledTimes(1);
          done();
        });
      } else {
        fail('Expected Observable result');
      }
    });

    it('should use different log messages for different scenarios', async () => {
      // Test authenticated scenario
      const mockUser = { id: '123' };
      (mockAuthService as any).user$ = of(mockUser);
      
      const result1 = guard(null as any, null as any);
      
      await new Promise<void>((resolve) => {
        if (result1 && typeof result1 === 'object' && 'subscribe' in result1) {
          result1.subscribe(() => {
            expect(consoleSpy).toHaveBeenCalledWith('User session valid, allowing access');
            resolve();
          });
        } else {
          fail('Expected Observable result');
        }
      });

      // Clear previous calls
      consoleSpy.mockClear();
      
      // Test unauthenticated scenario
      (mockAuthService as any).user$ = of(null);
      
      const result2 = guard(null as any, null as any);
      
      await new Promise<void>((resolve) => {
        if (result2 && typeof result2 === 'object' && 'subscribe' in result2) {
          result2.subscribe(() => {
            expect(consoleSpy).toHaveBeenCalledWith('No valid user session, redirecting to index');
            resolve();
          });
        } else {
          fail('Expected Observable result');
        }
      });
    });
  });

  // Basic guard creation test
  it('should be created', () => {
    expect(guard).toBeTruthy();
  });
});