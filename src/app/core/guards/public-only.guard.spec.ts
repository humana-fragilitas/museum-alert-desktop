import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { CanActivateFn } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { publicOnlyGuard } from './public-only.guard';
import { AuthService } from '../services/auth/auth.service';

describe('publicOnlyGuard', () => {
  let mockAuthService: Partial<AuthService>;
  let mockRouter: Partial<Router>;
  let userSubject: BehaviorSubject<any>;

  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => publicOnlyGuard(...guardParameters));

  beforeEach(() => {
    userSubject = new BehaviorSubject(null);
    
    mockAuthService = {
      user$: userSubject.asObservable(),
    };

    mockRouter = {
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });

  it('should allow access when user is not authenticated', (done) => {
    userSubject.next(null);

    const result = executeGuard(
      {} as any, // route
      {} as any  // state
    );

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

  it('should deny access and redirect to /device when user is authenticated', (done) => {
    const mockUser = { id: 1, email: 'test@example.com' };
    userSubject.next(mockUser);

    const result = executeGuard(
      {} as any, // route
      {} as any  // state
    );

    if (result && typeof result === 'object' && 'subscribe' in result) {
      result.subscribe((canActivate) => {
        expect(canActivate).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
        expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
        done();
      });
    } else {
      fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
    }
  });

  it('should allow access when user is undefined', (done) => {
    userSubject.next(undefined);

    const result = executeGuard(
      {} as any, // route
      {} as any  // state
    );

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

  it('should handle empty object as falsy user', (done) => {
    userSubject.next({});

    const result = executeGuard(
      {} as any, // route
      {} as any  // state
    );

    if (result && typeof result === 'object' && 'subscribe' in result) {
      result.subscribe((canActivate) => {
        expect(canActivate).toBe(false);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
        done();
      });
    } else {
      fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
    }
  });

  it('should handle authentication state changes', (done) => {
    // Start with no user
    userSubject.next(null);

    const result = executeGuard(
      {} as any, // route
      {} as any  // state
    );

    if (result && typeof result === 'object' && 'subscribe' in result) {
      let callCount = 0;
      
      result.subscribe((canActivate) => {
        callCount++;
        
        if (callCount === 1) {
          // First emission - no user, should allow
          expect(canActivate).toBe(true);
          expect(mockRouter.navigate).not.toHaveBeenCalled();
          
          // Simulate user login
          userSubject.next({ id: 1, email: 'test@example.com' });
        } else if (callCount === 2) {
          // Second emission - user authenticated, should deny and redirect
          expect(canActivate).toBe(false);
          expect(mockRouter.navigate).toHaveBeenCalledWith(['/device']);
          done();
        }
      });
    } else {
      fail(`Expected guard to return an observable, but got: ${typeof result} with value: ${result}`);
    }
  });
});