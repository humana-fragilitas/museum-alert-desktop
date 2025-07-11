import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';

import { ProvisioningService } from './provisioning.service';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';
import { APP_CONFIG } from '../../../../environments/environment';

// Mock the environment config
jest.mock('../../../../environments/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://api.example.com'
    }
  }
}));

describe('ProvisioningService', () => {
  let service: ProvisioningService;
  let httpTestingController: HttpTestingController;
  let authService: jest.Mocked<AuthService>;
  let deviceService: jest.Mocked<DeviceService>;

  // Mock data
  const mockCid = 'mock-cid-12345';
  const mockIdToken = 'mock-id-token-abc123';
  const mockSessionData = {
    tokens: {
      idToken: {
        toString: jest.fn().mockReturnValue(mockIdToken)
      }
    }
  };
  const mockApiResponse = {
    certificatePem: 'mock-certificate-pem',
    keyPair: {
      PrivateKey: 'mock-private-key'
    },
    provisioningTemplateBody: 'mock-template-body'
  };

  beforeEach(() => {
    // Create mock services
    const mockSessionDataSubject = new BehaviorSubject(mockSessionData);
    const authServiceMock = {
      sessionData: mockSessionDataSubject,
      sessionData$: mockSessionDataSubject.asObservable()
    };

    const deviceServiceMock = {
      generateCid: jest.fn().mockReturnValue(mockCid)
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ProvisioningService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: DeviceService, useValue: deviceServiceMock }
      ]
    });

    service = TestBed.inject(ProvisioningService);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    deviceService = TestBed.inject(DeviceService) as jest.Mocked<DeviceService>;
  });

  afterEach(() => {
    // Verify that no unmatched requests are outstanding
    httpTestingController.verify();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should inject dependencies correctly', () => {
      expect(authService).toBeDefined();
      expect(deviceService).toBeDefined();
    });
  });

  describe('createClaim', () => {
    it('should create a provisioning claim successfully', (done) => {
      // Arrange
      const expectedUrl = `${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`;
      const expectedResponse = {
        ...mockApiResponse,
        cid: mockCid,
        idToken: mockIdToken
      };

      // Act
      service.createClaim().subscribe({
        next: (response) => {
          // Assert
          expect(response).toEqual(expectedResponse);
          expect(response.cid).toBe(mockCid);
          expect(response.idToken).toBe(mockIdToken);
          expect(deviceService.generateCid).toHaveBeenCalledTimes(1);
          done();
        },
        error: done.fail
      });

      // Assert HTTP request
      const req = httpTestingController.expectOne(expectedUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toBeNull();
      
      // Respond with mock data
      req.flush(mockApiResponse);
    });

    it('should handle API response and map additional properties', (done) => {
      // Arrange
      const customApiResponse = {
        certificatePem: 'custom-cert',
        keyPair: { PrivateKey: 'custom-key' },
        additionalProperty: 'custom-value'
      };

      // Act
      service.createClaim().subscribe({
        next: (response) => {
          // Assert that original response properties are preserved
          expect(response.certificatePem).toBe(customApiResponse.certificatePem);
          expect(response.keyPair.PrivateKey).toBe(customApiResponse.keyPair.PrivateKey);
          expect(response.additionalProperty).toBe(customApiResponse.additionalProperty);
          
          // Assert that mapped properties are added
          expect(response.cid).toBe(mockCid);
          expect(response.idToken).toBe(mockIdToken);
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`);
      req.flush(customApiResponse);
    });

    it('should handle null session data gracefully', (done) => {
      // Arrange
      (authService.sessionData as BehaviorSubject<any>).next(null);

      // Act
      service.createClaim().subscribe({
        next: (response) => {
          // Assert
          expect(response.cid).toBe(mockCid);
          expect(response.idToken).toBeUndefined();
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`);
      req.flush(mockApiResponse);
    });

    it('should handle undefined tokens gracefully', (done) => {
      // Arrange
      (authService.sessionData as BehaviorSubject<any>).next({ tokens: undefined });

      // Act
      service.createClaim().subscribe({
        next: (response) => {
          // Assert
          expect(response.cid).toBe(mockCid);
          expect(response.idToken).toBeUndefined();
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`);
      req.flush(mockApiResponse);
    });

    it('should handle HTTP error responses', (done) => {
      // Arrange
      const errorResponse = { status: 500, statusText: 'Internal Server Error' };
      const errorMessage = 'Something went wrong';

      // Act
      service.createClaim().subscribe({
        next: () => done.fail('Expected error, but got success'),
        error: (error) => {
          // Assert
          expect(error.status).toBe(500);
          expect(error.statusText).toBe('Internal Server Error');
          done();
        }
      });

      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`);
      req.flush(errorMessage, errorResponse);
    });

    it('should handle network errors', (done) => {
      // Act
      service.createClaim().subscribe({
        next: () => done.fail('Expected error, but got success'),
        error: (error) => {
          // Assert
          expect(error.error).toBeInstanceOf(ProgressEvent);
          done();
        }
      });

      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should call deviceService.generateCid once per request', () => {
      // Arrange & Act
      const subscription = service.createClaim().subscribe();
      
      // Assert
      expect(deviceService.generateCid).toHaveBeenCalledTimes(1);
      
      // Clean up
      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`);
      req.flush(mockApiResponse);
      subscription.unsubscribe();
    });
  });

  describe('Integration Tests', () => {
    it('should work with real Observable chain', (done) => {
      // This test ensures the RxJS operators work correctly together
      let resultReceived = false;

      service.createClaim().subscribe({
        next: (response) => {
          resultReceived = true;
          expect(response).toBeDefined();
          expect(typeof response).toBe('object');
        },
        error: done.fail,
        complete: () => {
          expect(resultReceived).toBe(true);
          done();
        }
      });

      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/device-management/provisioning-claims/`);
      req.flush(mockApiResponse);
    });
  });
});