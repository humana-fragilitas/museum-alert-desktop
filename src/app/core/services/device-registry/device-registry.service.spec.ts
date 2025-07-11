import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, of } from 'rxjs';

import { DeviceRegistryService } from './device-registry.service';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';
import { APP_CONFIG } from '../../../../environments/environment';
import { Sensor, ListThingsResponse } from '../../models';

// Mock types
interface MockSessionData {
  tokens: {
    idToken: {
      payload: {
        'custom:Company': string;
      };
    };
  };
}

describe('DeviceRegistryService', () => {
  let service: DeviceRegistryService;
  let httpTestingController: HttpTestingController;
  let authService: jest.Mocked<AuthService>;
  let deviceService: jest.Mocked<DeviceService>;

  const mockCompany = 'test-company';
  const mockSessionData: MockSessionData = {
    tokens: {
      idToken: {
        payload: {
          'custom:Company': mockCompany
        }
      }
    }
  };

  const mockSensor: Sensor = {
    thingName: 'test-sensor-001',
    company: mockCompany
  };

  const mockListThingsResponse: ListThingsResponse = {
    company: mockCompany,
    things: [mockSensor],
    totalCount: 1,
    hasMore: false
  };

  beforeEach(() => {
    const authServiceMock = {
      sessionData: new BehaviorSubject(mockSessionData)
    };

    const deviceServiceMock = {};

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DeviceRegistryService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: DeviceService, useValue: deviceServiceMock }
      ]
    });

    service = TestBed.inject(DeviceRegistryService);
    httpTestingController = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
    deviceService = TestBed.inject(DeviceService) as jest.Mocked<DeviceService>;
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkSensorExists', () => {
    const thingName = 'test-sensor-001';
    const expectedUrl = `${APP_CONFIG.aws.apiGateway}/things/${thingName}/`;

    it('should return sensor data when device exists (200 response)', (done) => {
      const mockResponse = {
        data: mockSensor
      };

      service.checkSensorExists(thingName).subscribe({
        next: (result) => {
          expect(result).toEqual(mockResponse);
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.params.keys().length).toBe(0);
      
      req.flush(mockResponse, { status: 200, statusText: 'OK' });
    });

    it('should return null when device does not exist (404 response)', (done) => {
      service.checkSensorExists(thingName).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should throw error for non-404 HTTP errors', (done) => {
      const errorMessage = 'Server Error';
      
      service.checkSensorExists(thingName).subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe('Internal Server Error');
          done();
        }
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(errorMessage, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle null session data gracefully', (done) => {
      authService.sessionData.next(null);

      service.checkSensorExists(thingName).subscribe({
        next: (result) => {
          expect(result).toEqual({ data: mockSensor });
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush({ data: mockSensor }, { status: 200, statusText: 'OK' });
    });

    it('should handle undefined session data gracefully', (done) => {
      authService.sessionData.next(undefined as any);

      service.checkSensorExists(thingName).subscribe({
        next: (result) => {
          expect(result).toEqual({ data: mockSensor });
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush({ data: mockSensor }, { status: 200, statusText: 'OK' });
    });

    it('should log appropriate messages for existing device', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const mockResponse = { data: mockSensor };

      service.checkSensorExists(thingName).subscribe({
        next: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: checking device with name ${thingName} (company: ${mockCompany}) for existence in the registry...`
          );
          expect(consoleSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: found device with name ${mockSensor.thingName}: ${JSON.stringify(mockResponse)}`
          );
          expect(consoleSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: device associated company matches with user's organization`
          );
          
          consoleSpy.mockRestore();
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(mockResponse, { status: 200, statusText: 'OK' });
    });

    it('should log appropriate message for non-existing device', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.checkSensorExists(thingName).subscribe({
        next: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: device with name ${thingName} not found (404)`
          );
          
          consoleSpy.mockRestore();
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should detect company mismatch', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const differentCompanySensor = { ...mockSensor, company: 'different-company' };
      const mockResponse = { data: differentCompanySensor };

      service.checkSensorExists(thingName).subscribe({
        next: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: device associated company does not match with user's organization`
          );
          
          consoleSpy.mockRestore();
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(mockResponse, { status: 200, statusText: 'OK' });
    });
  });

  describe('getAllSensors', () => {
    const expectedUrl = `${APP_CONFIG.aws.apiGateway}/things`;

    it('should return array of sensors on successful response', (done) => {
      service.getAllSensors().subscribe({
        next: (result) => {
          expect(result).toEqual(mockListThingsResponse.things);
          expect(result).toHaveLength(1);
          expect(result[0]).toEqual(mockSensor);
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      
      req.flush(mockListThingsResponse);
    });

    it('should return empty array when no devices found (404 response)', (done) => {
      service.getAllSensors().subscribe({
        next: (result) => {
          expect(result).toEqual([]);
          expect(result).toHaveLength(0);
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should throw error for non-404 HTTP errors', (done) => {
      service.getAllSensors().subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error: HttpErrorResponse) => {
          expect(error.status).toBe(500);
          expect(error.statusText).toBe('Internal Server Error');
          done();
        }
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle response with multiple sensors', (done) => {
      const multipleSensors: Sensor[] = [
        { thingName: 'sensor-001', company: mockCompany },
        { thingName: 'sensor-002', company: mockCompany },
        { thingName: 'sensor-003', company: mockCompany }
      ];

      const multipleResponse: ListThingsResponse = {
        company: mockCompany,
        things: multipleSensors,
        totalCount: 3,
        hasMore: false
      };

      service.getAllSensors().subscribe({
        next: (result) => {
          expect(result).toEqual(multipleSensors);
          expect(result).toHaveLength(3);
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(multipleResponse);
    });

    it('should handle response with pagination info', (done) => {
      const paginatedResponse: ListThingsResponse = {
        company: mockCompany,
        things: [mockSensor],
        totalCount: 10,
        nextToken: 'next-page-token',
        hasMore: true
      };

      service.getAllSensors().subscribe({
        next: (result) => {
          expect(result).toEqual(paginatedResponse.things);
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(paginatedResponse);
    });

    it('should log appropriate messages for successful response', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.getAllSensors().subscribe({
        next: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: found ${mockListThingsResponse.things.length} devices for company ${mockCompany}`
          );
          
          consoleSpy.mockRestore();
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush(mockListThingsResponse);
    });

    it('should log appropriate message for 404 response', (done) => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.getAllSensors().subscribe({
        next: () => {
          expect(consoleSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: no devices found`
          );
          
          consoleSpy.mockRestore();
          done();
        },
        error: done.fail
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should log error for non-404 HTTP errors', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.getAllSensors().subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: () => {
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: error while listing devices:`,
            expect.any(HttpErrorResponse)
          );
          
          consoleErrorSpy.mockRestore();
          done();
        }
      });

      const req = httpTestingController.expectOne(expectedUrl);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully in checkSensorExists', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.checkSensorExists('test-sensor').subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error).toBeDefined();
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: error checking device existence:`,
            expect.any(Object)
          );
          
          consoleErrorSpy.mockRestore();
          done();
        }
      });

      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/things/test-sensor/`);
      req.error(new ProgressEvent('Network error'));
    });

    it('should handle network errors gracefully in getAllSensors', (done) => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      service.getAllSensors().subscribe({
        next: () => done.fail('Should have thrown an error'),
        error: (error) => {
          expect(error).toBeDefined();
          expect(consoleErrorSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: error while listing devices:`,
            expect.any(Object)
          );
          
          consoleErrorSpy.mockRestore();
          done();
        }
      });

      const req = httpTestingController.expectOne(`${APP_CONFIG.aws.apiGateway}/things`);
      req.error(new ProgressEvent('Network error'));
    });
  });
});