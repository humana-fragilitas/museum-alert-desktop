import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';

import { DeviceRegistryService } from './device-registry.service';
import { AuthService } from '../auth/auth.service';
import { APP_CONFIG } from '../../../../environments/environment';
import { Sensor, ListThingsResponse, SuccessApiResponse, ErrorApiResponse, ApiResult } from '../../models';


describe('DeviceRegistryService', () => {
  let service: DeviceRegistryService;
  let httpMock: HttpTestingController;
  let authService: { company: jest.Mock };

  const mockCompany = 'test-company';
  const thingName = 'sensor-001';
  const apiUrl = APP_CONFIG.aws.apiGateway;

  const mockSensor: Sensor = {
    thingName,
    company: mockCompany
  };

  const mockSuccessResponse: SuccessApiResponse<Sensor> = {
    data: mockSensor,
    timestamp: new Date().toISOString()
  };

  const mockListThingsResponse: SuccessApiResponse<ListThingsResponse> = {
    data: {
      company: mockCompany,
      things: [mockSensor],
      totalCount: 1,
      hasMore: false
    },
    timestamp: new Date().toISOString()
  };

  beforeEach(() => {
    authService = { company: jest.fn(() => mockCompany) };
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        DeviceRegistryService,
        { provide: AuthService, useValue: authService }
      ]
    });
    service = TestBed.inject(DeviceRegistryService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('checkSensorExists', () => {
    it('should return sensor data when device exists (200)', (done) => {
      service.checkSensorExists(thingName).subscribe({
        next: (result) => {
          expect(result).toEqual(mockSensor);
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      expect(req.request.method).toBe('GET');
      req.event(new HttpResponse<ApiResult<Sensor>>({ body: mockSuccessResponse, status: 200 }));
    });

    it('should return null when device does not exist (404)', (done) => {
      service.checkSensorExists(thingName).subscribe({
        next: (result) => {
          expect(result).toBeNull();
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should throw error for non-404 HTTP errors', (done) => {
      service.checkSensorExists(thingName).subscribe({
        next: () => done.fail('Should have thrown'),
        error: (err: HttpErrorResponse) => {
          expect(err.status).toBe(500);
          done();
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should log company match/mismatch', (done) => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      // Company matches
      service.checkSensorExists(thingName).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: device associated company matches with user's organization`
          );
          // Company mismatch
          logSpy.mockClear();
          const mismatchSensor: Sensor = { ...mockSensor, company: 'other-company' };
          const mismatchResponse: SuccessApiResponse<Sensor> = {
            data: mismatchSensor,
            timestamp: new Date().toISOString()
          };
          service.checkSensorExists(thingName).subscribe({
            next: () => {
              expect(logSpy).toHaveBeenCalledWith(
                `[DeviceRegistryService]: device associated company does not match with user's organization`
              );
              logSpy.mockRestore();
              done();
            },
            error: done.fail
          });
          const req2 = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
          req2.event(new HttpResponse<ApiResult<Sensor>>({ body: mismatchResponse, status: 200 }));
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.event(new HttpResponse<ApiResult<Sensor>>({ body: mockSuccessResponse, status: 200 }));
    });

    it('should log not found for 404', (done) => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      service.checkSensorExists(thingName).subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: device with name ${thingName} not found (404)`
          );
          logSpy.mockRestore();
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should log error for non-404 errors', (done) => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      service.checkSensorExists(thingName).subscribe({
        next: () => done.fail('Should have thrown'),
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: error checking device existence:`,
            expect.anything()
          );
          errorSpy.mockRestore();
          done();
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/things/${thingName}/`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  describe('getAllSensors', () => {
    it('should return array of sensors on success', (done) => {
      service.getAllSensors().subscribe({
        next: (result) => {
          expect(result).toEqual([mockSensor]);
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things`);
      req.flush(mockListThingsResponse);
    });

    it('should return empty array for 404', (done) => {
      service.getAllSensors().subscribe({
        next: (result) => {
          expect(result).toEqual([]);
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should throw error for non-404 HTTP errors', (done) => {
      service.getAllSensors().subscribe({
        next: () => done.fail('Should have thrown'),
        error: (err: HttpErrorResponse) => {
          expect(err.status).toBe(500);
          done();
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/things`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });

    it('should handle multiple sensors and pagination', (done) => {
      const sensors: Sensor[] = [
        { thingName: 'a', company: mockCompany },
        { thingName: 'b', company: mockCompany }
      ];
      const paginated: SuccessApiResponse<ListThingsResponse> = {
        data: {
          company: mockCompany,
          things: sensors,
          totalCount: 2,
          hasMore: true,
          nextToken: 'next-page'
        },
        timestamp: new Date().toISOString()
      };
      service.getAllSensors().subscribe({
        next: (result) => {
          expect(result).toEqual(sensors);
          done();
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things`);
      req.flush(paginated);
    });

    it('should log found devices and no devices', (done) => {
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      // Found
      service.getAllSensors().subscribe({
        next: () => {
          expect(logSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: found 1 devices for company ${mockCompany}`
          );
          // No devices
          logSpy.mockClear();
          service.getAllSensors().subscribe({
            next: () => {
              expect(logSpy).toHaveBeenCalledWith(
                `[DeviceRegistryService]: no devices found`
              );
              logSpy.mockRestore();
              done();
            },
            error: done.fail
          });
          const req2 = httpMock.expectOne(`${apiUrl}/things`);
          req2.flush('Not Found', { status: 404, statusText: 'Not Found' });
        },
        error: done.fail
      });
      const req = httpMock.expectOne(`${apiUrl}/things`);
      req.flush(mockListThingsResponse);
    });

    it('should log error for non-404 errors', (done) => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      service.getAllSensors().subscribe({
        next: () => done.fail('Should have thrown'),
        error: () => {
          expect(errorSpy).toHaveBeenCalledWith(
            `[DeviceRegistryService]: error while listing devices:`,
            expect.anything()
          );
          errorSpy.mockRestore();
          done();
        }
      });
      const req = httpMock.expectOne(`${apiUrl}/things`);
      req.flush('Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });
});