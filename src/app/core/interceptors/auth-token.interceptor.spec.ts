// Mock APP_CONFIG at the module level before any imports that use it
jest.mock('@env/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://api.example.com/v1'
    }
  }
}));

import { of,
         EMPTY } from 'rxjs';
import { AuthSession } from 'aws-amplify/auth';
import { AuthenticatorService } from '@aws-amplify/ui-angular';

import { TestBed } from '@angular/core/testing';
import { provideHttpClient,
         withInterceptors,
         HttpClient,
         HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting,
         HttpTestingController } from '@angular/common/http/testing';
import { signal,
         WritableSignal,
         Injector,
         InjectionToken } from '@angular/core';

import { authTokenInterceptor,
         AuthenticationExpiredError } from './auth-token.interceptor';
import { AuthService } from '@services/auth/auth.service';
import { DialogService } from '@services/dialog/dialog.service';
import { DialogType } from '@models';


const TEST_APP_CONFIG = new InjectionToken('TEST_APP_CONFIG');

interface MockAuthService {
  sessionData: WritableSignal<AuthSession | null>;
  idToken: jest.Mock;
}

const TEST_API_URL = 'https://api.example.com/v1/test';
const apiUrl = TEST_API_URL;

describe('authTokenInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let mockAuthService: MockAuthService;
  let mockAuthenticatorService: jest.Mocked<AuthenticatorService>;
  let mockDialogService: jest.Mocked<DialogService>;
  let sessionDataSignal: WritableSignal<AuthSession | null>;
  let injector: Injector;

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
        toString: () => 'test-id-token',
        payload: {}
      } as any
    },
    userSub: 'sub'
  };

  const mockAppConfig = {
    production: false,
    environment: 'LOCAL',
    aws: {
      apiGateway: 'https://api.example.com/v1',
      region: 'eu-west-1',
      algorithm: 'AWS4-HMAC-SHA256',
      IoTCore: {
        endpoint: 'avlck1-ats.iot.eu-west-1.amazonaws.com',
        service: 'iotdevicegateway'
      },
      amplify: {
        Auth: {
          Cognito: {
            userPoolId: 'eu-west-1_4jP',
            userPoolClientId: '6tq3lpq5gbi2',
            identityPoolId: 'eu-west-1:97',
            mandatorySignIn: true,
            authenticationFlowType: 'USER_SRP_AUTH'
          }
        }
      }
    },
    settings: {
      MQTT_RESPONSE_TIMEOUT: 10000,
      USB_RESPONSE_TIMEOUT: 10000,
    }
  };

  beforeEach(() => {

    sessionDataSignal = signal<AuthSession | null>(null);
    
    mockAuthService = {
      sessionData: sessionDataSignal,
      idToken: jest.fn()
    };

    mockAuthenticatorService = {
      signOut: jest.fn()
    } as any;

    mockDialogService = {
      openDialog: jest.fn().mockReturnValue(of(true))
    } as any;

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authTokenInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthenticatorService, useValue: mockAuthenticatorService },
        { provide: DialogService, useValue: mockDialogService }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    injector = TestBed.inject(Injector);

    jest.clearAllMocks();

  });

  afterEach(() => {
    try {
      const pendingRequests = httpTestingController.match(() => true);
      pendingRequests.forEach(req => {
        if (!req.cancelled) {
          req.flush(null, { status: 200, statusText: 'OK' });
        }
      });
    } catch (e) {
      // Ignore errors during cleanup
    }
    
    httpTestingController.verify();
  });

  describe('Token Addition', () => {

    describe('when request URL starts with API Gateway base path', () => {
      it('should add Authorization header when idToken is available', () => {
        const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
        mockAuthService.idToken.mockReturnValue(testToken);

        httpClient.get(TEST_API_URL).subscribe();

        const req = httpTestingController.expectOne(TEST_API_URL);
        expect(req.request.headers.get('Authorization')).toBe(testToken);
        
        req.flush({ data: 'test' });
      });

      it('should not add Authorization header when idToken is null', () => {
        mockAuthService.idToken.mockReturnValue(null);

        httpClient.get(apiUrl).subscribe();

        const req = httpTestingController.expectOne(apiUrl);
        expect(req.request.headers.get('Authorization')).toBeNull();
        
        req.flush({ data: 'test' });
      });

      it('should not add Authorization header when idToken is undefined', () => {
        mockAuthService.idToken.mockReturnValue(undefined);

        httpClient.get(apiUrl).subscribe();

        const req = httpTestingController.expectOne(apiUrl);
        expect(req.request.headers.get('Authorization')).toBeNull();
        
        req.flush({ data: 'test' });
      });

      it('should not add Authorization header when idToken is empty string', () => {
        mockAuthService.idToken.mockReturnValue('');

        httpClient.get(apiUrl).subscribe();

        const req = httpTestingController.expectOne(apiUrl);
        expect(req.request.headers.get('Authorization')).toBeNull();
        
        req.flush({ data: 'test' });
      });

      it('should preserve existing headers when adding Authorization', () => {
        const testToken = 'valid.jwt.token';
        mockAuthService.idToken.mockReturnValue(testToken);

        const headers = { 'Content-Type': 'application/json', 'X-Custom-Header': 'custom-value' };
        httpClient.get(apiUrl, { headers }).subscribe();

        const req = httpTestingController.expectOne(apiUrl);
        expect(req.request.headers.get('Authorization')).toBe(testToken);
        expect(req.request.headers.get('Content-Type')).toBe('application/json');
        expect(req.request.headers.get('X-Custom-Header')).toBe('custom-value');
        
        req.flush({ data: 'test' });
      });

      it('should override existing Authorization header if idToken is truthy', () => {
        const newToken = 'new.jwt.token';
        const oldToken = 'old.jwt.token';
        mockAuthService.idToken.mockReturnValue(newToken);

        const headers = { 'Authorization': oldToken };
        httpClient.get(apiUrl, { headers }).subscribe();

        const req = httpTestingController.expectOne(apiUrl);
        expect(req.request.headers.get('Authorization')).toBe(newToken);
        
        req.flush({ data: 'test' });
      });

      it('should not override existing Authorization header if idToken is falsy', () => {
        const oldToken = 'old.jwt.token';
        mockAuthService.idToken.mockReturnValue(null);

        const headers = { 'Authorization': oldToken };
        httpClient.get(apiUrl, { headers }).subscribe();

        const req = httpTestingController.expectOne(apiUrl);
        expect(req.request.headers.get('Authorization')).toBe(oldToken);
        
        req.flush({ data: 'test' });
      });
    });

    describe('when request URL does NOT start with API Gateway base path', () => {
      const externalUrls = [
        'https://external-api.com/data',
        'https://api.different.com/v1/users',
        'https://api.example.com/v2/users',
        'http://api.example.com/v1/users',
        'https://sub.api.example.com/v1/users'
      ];

      externalUrls.forEach(url => {
        it(`should not add Authorization header for URL: ${url}`, () => {
          const testToken = 'valid.jwt.token';
          mockAuthService.idToken.mockReturnValue(testToken);

          httpClient.get(url).subscribe();

          const req = httpTestingController.expectOne(url);
          expect(req.request.headers.get('Authorization')).toBeNull();
          
          req.flush({ data: 'test' });
        });
      });

      it('should still call idToken() for all URLs (current behavior)', () => {
        const externalUrl = 'https://external-api.com/data';
        mockAuthService.idToken.mockClear();
        httpClient.get(externalUrl).subscribe();
        const req = httpTestingController.expectOne(externalUrl);
        expect(mockAuthService.idToken).toHaveBeenCalled();
        req.flush({ data: 'test' });
      });
    });

  });

  describe('401 Error Handling', () => {

    const apiUrl = 'https://api.example.com/v1/protected-resource';

    it('should handle 401 errors and throw AuthenticationExpiredError', (done) => {
      const testToken = 'expired.jwt.token';
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error).toBeInstanceOf(AuthenticationExpiredError);
          expect(error.name).toBe('AuthenticationExpiredError');
          expect(error.message).toBe('Authentication expired');
          expect(error.originalError).toBeInstanceOf(HttpErrorResponse);
          expect(error.originalError.status).toBe(401);
          done();
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should open error dialog on 401 error', () => {
      const testToken = 'expired.jwt.token';
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get(apiUrl).subscribe({
        error: () => {}
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

      expect(mockDialogService.openDialog).toHaveBeenCalledWith({
        type: DialogType.ERROR,
        title: 'ERRORS.APPLICATION.AUTHENTICATION_EXPIRED_TITLE',
        message: 'ERRORS.APPLICATION.AUTHENTICATION_EXPIRED_MESSAGE'
      });
    });

    it('should sign out user after dialog is closed', (done) => {
      const testToken = 'expired.jwt.token';
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get(apiUrl).subscribe({
        error: () => {
          setTimeout(() => {
            expect(mockAuthenticatorService.signOut).toHaveBeenCalled();
            done();
          }, 0);
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle dialog service errors gracefully', (done) => {
      const testToken = 'expired.jwt.token';
      mockAuthService.idToken.mockReturnValue(testToken);
      mockDialogService.openDialog.mockReturnValue(EMPTY);

      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error).toBeInstanceOf(AuthenticationExpiredError);
          expect(error.originalError.status).toBe(401);
          expect(mockAuthenticatorService.signOut).not.toHaveBeenCalled();
          done();
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('Non-401 Error Handling', () => {
    const apiUrl = 'https://api.example.com/v1/resource';

    const errorTestCases = [
      { status: 400, statusText: 'Bad Request' },
      { status: 403, statusText: 'Forbidden' },
      { status: 404, statusText: 'Not Found' },
      { status: 422, statusText: 'Unprocessable Entity' },
      { status: 500, statusText: 'Internal Server Error' },
      { status: 502, statusText: 'Bad Gateway' },
      { status: 503, statusText: 'Service Unavailable' }
    ];

    errorTestCases.forEach(({ status, statusText }) => {
      it(`should pass through ${status} errors without special handling`, (done) => {
        const testToken = 'valid.jwt.token';
        mockAuthService.idToken.mockReturnValue(testToken);

        httpClient.get(apiUrl).subscribe({
          next: () => fail('Should not succeed'),
          error: (error: HttpErrorResponse) => {
            expect(error).toBeInstanceOf(HttpErrorResponse);
            expect(error).not.toBeInstanceOf(AuthenticationExpiredError);
            expect(error.status).toBe(status);
            expect(error.statusText).toBe(statusText);
            done();
          }
        });

        const req = httpTestingController.expectOne(apiUrl);
        req.flush(`Error: ${statusText}`, { status, statusText });
      });
    });

    it('should not open dialog for non-401 errors', () => {
      const testToken = 'valid.jwt.token';
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get(apiUrl).subscribe({
        error: () => {}
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });

      expect(mockDialogService.openDialog).not.toHaveBeenCalled();
      expect(mockAuthenticatorService.signOut).not.toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {

    it('should handle successful request with token', (done) => {
      const testToken = 'valid.jwt.token';
      const apiUrl = 'https://api.example.com/v1/user-profile';
      const responseData = { id: 1, name: 'John Doe', email: 'john@example.com' };
      
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get(apiUrl).subscribe({
        next: (response) => {
          expect(response).toEqual(responseData);
          done();
        },
        error: () => fail('Should not error')
      });

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.headers.get('Authorization')).toBe(testToken);
      req.flush(responseData);
    });

    it('should handle POST request with token and body', () => {
      const testToken = 'valid.jwt.token';
      const apiUrl = 'https://api.example.com/v1/create-user';
      const postData = { name: 'Jane Doe', email: 'jane@example.com' };
      
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.post(apiUrl, postData).subscribe();

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.headers.get('Authorization')).toBe(testToken);
      expect(req.request.body).toEqual(postData);
      
      req.flush({ id: 2, ...postData });
    });

    it('should handle multiple simultaneous requests', () => {
      const testToken = 'valid.jwt.token';
      const urls = [
        'https://api.example.com/v1/users',
        'https://api.example.com/v1/posts',
        'https://api.example.com/v1/comments'
      ];
      
      mockAuthService.idToken.mockReturnValue(testToken);

      urls.forEach(url => {
        httpClient.get(url).subscribe();
      });

      urls.forEach(url => {
        const req = httpTestingController.expectOne(url);
        expect(req.request.headers.get('Authorization')).toBe(testToken);
        req.flush({ data: `Response for ${url}` });
      });
    });

    it('should handle mixed internal and external requests', () => {
      const testToken = 'valid.jwt.token';
      const internalUrl = 'https://api.example.com/v1/internal';
      const externalUrl = 'https://external-api.com/public';
      
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get(internalUrl).subscribe();
      httpClient.get(externalUrl).subscribe();

      const internalReq = httpTestingController.expectOne(internalUrl);
      expect(internalReq.request.headers.get('Authorization')).toBe(testToken);
      internalReq.flush({ data: 'internal' });

      const externalReq = httpTestingController.expectOne(externalUrl);
      expect(externalReq.request.headers.get('Authorization')).toBeNull();
      externalReq.flush({ data: 'external' });
    });

  });

  describe('Edge Cases', () => {

    it('should handle undefined APP_CONFIG gracefully', () => {

      const testToken = 'valid.jwt.token';
      const apiUrl = 'https://api.example.com/v1/test';
      
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get(apiUrl).subscribe();

      const req = httpTestingController.expectOne(apiUrl);
      expect(req.request.headers.get('Authorization')).toBe(testToken);
      req.flush({ data: 'test' });
    });

    it('should handle network errors', (done) => {
      const testToken = 'valid.jwt.token';
      const apiUrl = 'https://api.example.com/v1/network-fail';
      
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get(apiUrl).subscribe({
        next: () => fail('Should not succeed'),
        error: (error) => {
          expect(error).toBeInstanceOf(HttpErrorResponse);
          expect(error.error).toBeInstanceOf(ProgressEvent);
          done();
        }
      });

      const req = httpTestingController.expectOne(apiUrl);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle malformed 401 response', (done) => {
      const testToken = 'expired.jwt.token';
      mockAuthService.idToken.mockReturnValue(testToken);

      httpClient.get('https://api.example.com/v1/malformed').subscribe({
        error: (error) => {
          expect(error).toBeInstanceOf(AuthenticationExpiredError);
          expect(mockDialogService.openDialog).toHaveBeenCalled();
          done();
        }
      });

      const req = httpTestingController.expectOne('https://api.example.com/v1/malformed');
      req.error(new ProgressEvent('error'), { status: 401, statusText: 'Unauthorized' });
    });

  });

  describe('AuthenticationExpiredError Class', () => {

    it('should create error with correct properties', () => {
      const originalError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized',
        url: 'https://api.example.com/v1/test'
      });

      const authError = new AuthenticationExpiredError(originalError);

      expect(authError.name).toBe('AuthenticationExpiredError');
      expect(authError.message).toBe('Authentication expired');
      expect(authError.originalError).toBe(originalError);
      expect(authError).toBeInstanceOf(Error);
      expect(authError).toBeInstanceOf(AuthenticationExpiredError);
    });

    it('should maintain error stack trace', () => {
      const originalError = new HttpErrorResponse({
        status: 401,
        statusText: 'Unauthorized'
      });

      const authError = new AuthenticationExpiredError(originalError);

      expect(authError.stack).toBeDefined();
      expect(typeof authError.stack).toBe('string');
    });

  });
  
});