// auth-token.interceptor.spec.ts

import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn, HttpRequest, HttpResponse } from '@angular/common/http';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { of, throwError } from 'rxjs';

import { authTokenInterceptor, AuthenticationExpiredError } from './auth-token.interceptor';
import { AuthService } from '@services/auth/auth.service';
import { DialogService } from '@services/dialog/dialog.service';
import { DialogType, HttpStatusCode } from '@models';
import { APP_CONFIG } from '@env/environment';

// Mock APP_CONFIG
jest.mock('@env/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://api.example.com'
    }
  }
}));

describe('AuthTokenInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let authService: jest.Mocked<AuthService>;
  let authenticatorService: jest.Mocked<AuthenticatorService>;
  let dialogService: jest.Mocked<DialogService>;

  const mockIdToken = 'mock-jwt-token-12345';
  const apiUrl = 'https://api.example.com/test';
  const externalUrl = 'https://external-api.com/test';

  beforeEach(() => {
    const authServiceMock = {
      idToken: jest.fn().mockReturnValue('')
    };

    const authenticatorServiceMock = {
      signOut: jest.fn()
    };

    const dialogServiceMock = {
      openDialog: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceMock },
        { provide: AuthenticatorService, useValue: authenticatorServiceMock },
        { provide: DialogService, useValue: dialogServiceMock }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    authenticatorService = TestBed.inject(AuthenticatorService) as jest.Mocked<AuthenticatorService>;
    dialogService = TestBed.inject(DialogService) as jest.Mocked<DialogService>;

    // Setup default mock implementations
    dialogService.openDialog.mockReturnValue(of({ confirmed: true }));
  });

  afterEach(() => {
    httpTestingController.verify();
    jest.clearAllMocks();
  });

  describe('Token Addition', () => {
    it('should add Authorization header when request URL matches API gateway and token exists', () => {
      authService.idToken.mockReturnValue(mockIdToken);

      httpClient.get(apiUrl).subscribe();

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.headers.get('Authorization')).toBe(mockIdToken);
      
      req.flush({ data: 'test' });
    });

    it('should not add Authorization header when request URL does not match API gateway', () => {
      authService.idToken.mockReturnValue(mockIdToken);

      httpClient.get(externalUrl).subscribe();

      const req = httpTestingController.expectOne(externalUrl);
      expect(req.request.headers.get('Authorization')).toBeNull();
      
      req.flush({ data: 'test' });
    });

    it('should not add Authorization header when no token is available', () => {
      authService.idToken.mockReturnValue('');

      httpClient.get(apiUrl).subscribe();

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.headers.get('Authorization')).toBeNull();
      
      req.flush({ data: 'test' });
    });

    it('should not add Authorization header when token is empty string', () => {
      authService.idToken.mockReturnValue('');

      httpClient.get(apiUrl).subscribe();

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.headers.get('Authorization')).toBeNull();
      
      req.flush({ data: 'test' });
    });
  });

  describe('401 Error Handling', () => {
    it('should handle 401 error and show authentication expired dialog', (done) => {
      authService.idToken.mockReturnValue(mockIdToken);
      
      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error).toBeInstanceOf(AuthenticationExpiredError);
          expect(error.originalError.status).toBe(HttpStatusCode.UNAUTHORIZED);
          done();
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush(
        { message: 'Unauthorized' },
        { status: HttpStatusCode.UNAUTHORIZED, statusText: 'Unauthorized' }
      );

      expect(dialogService.openDialog).toHaveBeenCalledWith({
        type: DialogType.ERROR,
        title: 'ERRORS.APPLICATION.AUTHENTICATION_EXPIRED_TITLE',
        message: 'ERRORS.APPLICATION.AUTHENTICATION_EXPIRED_MESSAGE'
      });
    });

    it('should call signOut after dialog is closed on 401 error', (done) => {
      authService.idToken.mockReturnValue(mockIdToken);
      
      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: () => {
          // Wait for async operations to complete
          setTimeout(() => {
            expect(authenticatorService.signOut).toHaveBeenCalled();
            done();
          }, 0);
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush(
        { message: 'Unauthorized' },
        { status: HttpStatusCode.UNAUTHORIZED, statusText: 'Unauthorized' }
      );
    });

    it('should create AuthenticationExpiredError with original error', (done) => {
      authService.idToken.mockReturnValue(mockIdToken);
      
      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (caughtError) => {
          expect(caughtError).toBeInstanceOf(AuthenticationExpiredError);
          expect(caughtError.name).toBe('AuthenticationExpiredError');
          expect(caughtError.message).toBe('Authentication expired');
          expect(caughtError.originalError).toBeInstanceOf(HttpErrorResponse);
          expect(caughtError.originalError.status).toBe(401);
          done();
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      const errorResponse = { message: 'Token expired' };
      req.flush(errorResponse, { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Other HTTP Errors', () => {
    it('should pass through non-401 errors unchanged', () => {
      authService.idToken.mockReturnValue(mockIdToken);
      
      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(HttpStatusCode.INTERNAL_SERVER_ERROR);
          expect(error).not.toBeInstanceOf(AuthenticationExpiredError);
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush(
        { message: 'Server Error' },
        { status: HttpStatusCode.INTERNAL_SERVER_ERROR, statusText: 'Internal Server Error' }
      );

      expect(dialogService.openDialog).not.toHaveBeenCalled();
      expect(authenticatorService.signOut).not.toHaveBeenCalled();
    });

    it('should pass through 403 Forbidden errors unchanged', () => {
      authService.idToken.mockReturnValue(mockIdToken);
      
      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(HttpStatusCode.FORBIDDEN);
          expect(error).not.toBeInstanceOf(AuthenticationExpiredError);
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush(
        { message: 'Forbidden' },
        { status: HttpStatusCode.FORBIDDEN, statusText: 'Forbidden' }
      );

      expect(dialogService.openDialog).not.toHaveBeenCalled();
      expect(authenticatorService.signOut).not.toHaveBeenCalled();
    });

    it('should pass through 404 Not Found errors unchanged', () => {
      authService.idToken.mockReturnValue(mockIdToken);
      
      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should have thrown an error'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.status).toBe(HttpStatusCode.NOT_FOUND);
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush(
        { message: 'Not Found' },
        { status: HttpStatusCode.NOT_FOUND, statusText: 'Not Found' }
      );

      expect(dialogService.openDialog).not.toHaveBeenCalled();
    });
  });

  describe('Successful Requests', () => {
    it('should pass through successful requests with token', () => {
      authService.idToken.mockReturnValue(mockIdToken);
      const mockResponse = { data: 'success', id: 123 };
      
      httpClient.get(apiUrl).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.headers.get('Authorization')).toBe(mockIdToken);
      req.flush(mockResponse);

      expect(dialogService.openDialog).not.toHaveBeenCalled();
      expect(authenticatorService.signOut).not.toHaveBeenCalled();
    });

    it('should pass through successful requests without token for external URLs', () => {
      authService.idToken.mockReturnValue(mockIdToken);
      const mockResponse = { data: 'external success' };
      
      httpClient.get(externalUrl).subscribe((response) => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpTestingController.expectOne(externalUrl);
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush(mockResponse);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty API gateway configuration', () => {
      // Mock empty API gateway config
      jest.doMock('@env/environment', () => ({
        APP_CONFIG: {
          aws: {
            apiGateway: ''
          }
        }
      }));

      authService.idToken.mockReturnValue(mockIdToken);

      httpClient.get(apiUrl).subscribe();

      const req = httpTestingController.expectOne(apiUrl);
      // Should not add header since API gateway is empty
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({ data: 'test' });
    });

    it('should handle URL that partially matches API gateway', () => {
      authService.idToken.mockReturnValue(mockIdToken);
      const partialMatchUrl = 'https://api.example.co/test'; // Note: .co instead of .com

      httpClient.get(partialMatchUrl).subscribe();

      const req = httpTestingController.expectOne(partialMatchUrl);
      expect(req.request.headers.get('Authorization')).toBeNull();
      req.flush({ data: 'test' });
    });

    it('should handle request with existing Authorization header', () => {
      authService.idToken.mockReturnValue(mockIdToken);
      const existingToken = 'existing-token';

      httpClient.get(apiUrl, {
        headers: { 'Authorization': existingToken }
      }).subscribe();

      const req = httpTestingController.expectOne(apiUrl);
      // Should override existing Authorization header
      expect(req.request.headers.get('Authorization')).toBe(mockIdToken);
      req.flush({ data: 'test' });
    });
  });

  describe('AuthenticationExpiredError Class', () => {
    it('should create AuthenticationExpiredError with correct properties', () => {
      const originalError = new HttpErrorResponse({
        error: 'Unauthorized',
        status: 401,
        statusText: 'Unauthorized'
      });

      const authError = new AuthenticationExpiredError(originalError);

      expect(authError).toBeInstanceOf(Error);
      expect(authError).toBeInstanceOf(AuthenticationExpiredError);
      expect(authError.name).toBe('AuthenticationExpiredError');
      expect(authError.message).toBe('Authentication expired');
      expect(authError.originalError).toBe(originalError);
    });
  });
});

// Integration test to ensure interceptor works with HttpClient
describe('AuthTokenInterceptor Integration', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        {
          provide: AuthService,
          useValue: { idToken: () => 'integration-token' }
        },
        {
          provide: AuthenticatorService,
          useValue: { signOut: jest.fn() }
        },
        {
          provide: DialogService,
          useValue: { openDialog: () => of({ confirmed: true }) }
        }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should work end-to-end with multiple requests', () => {
    const responses: any[] = [];
    const errors: any[] = [];

    // Make multiple requests
    httpClient.get('https://api.example.com/users').subscribe({
      next: (res) => responses.push(res),
      error: (err) => errors.push(err)
    });

    httpClient.post('https://api.example.com/data', { test: true }).subscribe({
      next: (res) => responses.push(res),
      error: (err) => errors.push(err)
    });

    httpClient.get('https://external.com/api').subscribe({
      next: (res) => responses.push(res),
      error: (err) => errors.push(err)
    });

    // Verify and respond to requests
    const req1 = httpTestingController.expectOne('https://api.example.com/users');
    expect(req1.request.headers.get('Authorization')).toBe('integration-token');
    req1.flush({ users: [] });

    const req2 = httpTestingController.expectOne('https://api.example.com/data');
    expect(req2.request.headers.get('Authorization')).toBe('integration-token');
    req2.flush({ data: 'created' });

    const req3 = httpTestingController.expectOne('https://external.com/api');
    expect(req3.request.headers.get('Authorization')).toBeNull();
    req3.flush({ external: 'data' });

    expect(responses).toHaveLength(3);
    expect(errors).toHaveLength(0); 
  });
});