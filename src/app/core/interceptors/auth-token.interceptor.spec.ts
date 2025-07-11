import { TestBed } from '@angular/core/testing';
import { HttpRequest, HttpResponse, HttpErrorResponse, HttpInterceptorFn, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { AuthService } from '../services/auth/auth.service';
import { DialogService } from '../services/dialog/dialog.service';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { authTokenInterceptor, AuthenticationExpiredError } from './auth-token.interceptor';

// Mock APP_CONFIG
jest.mock('../../../environments/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://api.example.com'
    }
  }
}));

describe('authTokenInterceptor', () => {
  let authService: jest.Mocked<AuthService>;
  let dialogService: jest.Mocked<DialogService>;
  let authenticatorService: jest.Mocked<AuthenticatorService>;
  let mockNext: jest.Mock;
  let interceptor: HttpInterceptorFn;

  const mockSessionData = {
    tokens: {
      idToken: {
        toString: jest.fn().mockReturnValue('mock-id-token')
      }
    }
  };

  beforeEach(() => {
    // Create mocks
    authService = {
      sessionData: new BehaviorSubject(mockSessionData)
    } as any;

    dialogService = {
      showError: jest.fn().mockReturnValue(of(true))
    } as any;

    authenticatorService = {
      signOut: jest.fn()
    } as any;

    mockNext = jest.fn();

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: DialogService, useValue: dialogService },
        { provide: AuthenticatorService, useValue: authenticatorService }
      ]
    });

    // Create interceptor instance
    interceptor = (req, next) => 
      TestBed.runInInjectionContext(() => authTokenInterceptor(req, next));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Addition', () => {
    it('should add authorization token to requests matching allowed base path', (done) => {
      const request = new HttpRequest('GET', 'https://api.example.com/users');
      const response = new HttpResponse({ status: 200, body: {} });
      
      mockNext.mockReturnValue(of(response));

      interceptor(request, mockNext).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          expect(mockNext).toHaveBeenCalledTimes(1);
          
          // Verify the Authorization header was set
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.headers.get('Authorization')).toBe('mock-id-token');
          done();
        },
        error: done
      });
    });

    it('should not add authorization token to requests not matching allowed base path', (done) => {
      const request = new HttpRequest('GET', 'https://other-api.example.com/users');
      const response = new HttpResponse({ status: 200, body: {} });
      
      mockNext.mockReturnValue(of(response));

      interceptor(request, mockNext).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.headers.get('Authorization')).toBeNull();
          done();
        },
        error: done
      });
    });

    it('should handle requests when session data is null', (done) => {
      authService.sessionData.next(null);
      const request = new HttpRequest('GET', 'https://api.example.com/users');
      const response = new HttpResponse({ status: 200, body: {} });
      
      mockNext.mockReturnValue(of(response));

      interceptor(request, mockNext).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.headers.get('Authorization')).toBeNull();
          done();
        },
        error: done
      });
    });

    it('should handle requests when tokens are undefined', (done) => {
      authService.sessionData.next({ tokens: undefined });
      const request = new HttpRequest('GET', 'https://api.example.com/users');
      const response = new HttpResponse({ status: 200, body: {} });
      
      mockNext.mockReturnValue(of(response));

      interceptor(request, mockNext).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.headers.get('Authorization')).toBeNull();
          done();
        },
        error: done
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 401 errors by showing dialog and signing out', (done) => {
      const request = new HttpRequest('GET', 'https://api.example.com/users');
      const error401 = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: request.url
      });
      
      mockNext.mockReturnValue(throwError(() => error401));

      interceptor(request, mockNext).subscribe({
        next: () => {
          done(new Error('Expected error but got success'));
        },
        error: (error) => {
          expect(error).toBeInstanceOf(AuthenticationExpiredError);
          expect(error.originalError).toBe(error401);
          expect(error.message).toBe('Authentication expired');
          
          expect(dialogService.showError).toHaveBeenCalledWith(
            'Authentication expired',
            'Please log in again to continue.',
            '',
            { disableClose: true }
          );
          
          expect(authenticatorService.signOut).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should pass through non-401 errors unchanged', (done) => {
      const request = new HttpRequest('GET', 'https://api.example.com/users');
      const error500 = new HttpErrorResponse({
        status: 500,
        statusText: 'Internal Server Error',
        url: request.url
      });
      
      mockNext.mockReturnValue(throwError(() => error500));

      interceptor(request, mockNext).subscribe({
        next: () => {
          done(new Error('Expected error but got success'));
        },
        error: (error) => {
          expect(error).toBe(error500);
          expect(error).not.toBeInstanceOf(AuthenticationExpiredError);
          expect(dialogService.showError).not.toHaveBeenCalled();
          expect(authenticatorService.signOut).not.toHaveBeenCalled();
          done();
        }
      });
    });

    it('should handle 401 errors on non-API requests without adding token', (done) => {
      const request = new HttpRequest('GET', 'https://other-api.example.com/users');
      const error401 = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: request.url
      });
      
      mockNext.mockReturnValue(throwError(() => error401));

      interceptor(request, mockNext).subscribe({
        next: () => {
          done(new Error('Expected error but got success'));
        },
        error: (error) => {
          expect(error).toBeInstanceOf(AuthenticationExpiredError);
          expect(error.originalError).toBe(error401);
          
          // Verify no token was added to the original request
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.headers.get('Authorization')).toBeNull();
          
          expect(dialogService.showError).toHaveBeenCalled();
          expect(authenticatorService.signOut).toHaveBeenCalled();
          done();
        }
      });
    });
  });

  describe('Integration Tests', () => {
    it('should successfully process a complete request flow', (done) => {
      const request = new HttpRequest('POST', 'https://api.example.com/data', { test: 'data' });
      const response = new HttpResponse({ 
        status: 200, 
        body: { success: true },
        headers: request.headers
      });
      
      mockNext.mockReturnValue(of(response));

      interceptor(request, mockNext).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          
          // Verify the request was modified correctly
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.url).toBe(request.url);
          expect(capturedRequest.method).toBe(request.method);
          expect(capturedRequest.body).toBe(request.body);
          expect(capturedRequest.headers.get('Authorization')).toBe('mock-id-token');
          
          done();
        },
        error: done
      });
    });

    it('should call both dialog service and sign out on 401 error', (done) => {
      const request = new HttpRequest('GET', 'https://api.example.com/users');
      const error401 = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: request.url
      });
      
      mockNext.mockReturnValue(throwError(() => error401));

      interceptor(request, mockNext).subscribe({
        next: () => {
          done(new Error('Expected error but got success'));
        },
        error: (error) => {
          expect(error).toBeInstanceOf(AuthenticationExpiredError);
          expect(dialogService.showError).toHaveBeenCalledWith(
            'Authentication expired',
            'Please log in again to continue.',
            '',
            { disableClose: true }
          );
          expect(authenticatorService.signOut).toHaveBeenCalled();
          done();
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty URL', (done) => {
      const request = new HttpRequest('GET', '');
      const response = new HttpResponse({ status: 200, body: {} });
      
      mockNext.mockReturnValue(of(response));

      interceptor(request, mockNext).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.headers.get('Authorization')).toBeNull();
          done();
        },
        error: done
      });
    });

    it('should handle URL that partially matches base path', (done) => {
      const request = new HttpRequest('GET', 'https://api.example.co'); // Missing 'm'
      const response = new HttpResponse({ status: 200, body: {} });
      
      mockNext.mockReturnValue(of(response));

      interceptor(request, mockNext).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.headers.get('Authorization')).toBeNull();
          done();
        },
        error: done
      });
    });

    it('should preserve existing headers when adding authorization', (done) => {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json',
        'X-Custom-Header': 'test'
      });
      const request = new HttpRequest('GET', 'https://api.example.com/users', null, {
        headers: headers
      });
      const response = new HttpResponse({ status: 200, body: {} });
      
      mockNext.mockReturnValue(of(response));

      interceptor(request, mockNext).subscribe({
        next: (result) => {
          expect(result).toBe(response);
          const capturedRequest = mockNext.mock.calls[0][0];
          expect(capturedRequest.headers.get('Authorization')).toBe('mock-id-token');
          expect(capturedRequest.headers.get('Content-Type')).toBe('application/json');
          expect(capturedRequest.headers.get('X-Custom-Header')).toBe('test');
          done();
        },
        error: done
      });
    });
  });

  describe('AuthenticationExpiredError', () => {
    it('should create AuthenticationExpiredError with correct properties', () => {
      const originalError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });
      
      const authError = new AuthenticationExpiredError(originalError);
      
      expect(authError.name).toBe('AuthenticationExpiredError');
      expect(authError.message).toBe('Authentication expired');
      expect(authError.originalError).toBe(originalError);
      expect(authError).toBeInstanceOf(Error);
      expect(authError).toBeInstanceOf(AuthenticationExpiredError);
    });
  });
});