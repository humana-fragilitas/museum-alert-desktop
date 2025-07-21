import { TestBed } from '@angular/core/testing';
import { ErrorService } from './error.service';
import { DeviceErrorType, ErrorType, AppErrorType } from '../../../../../app/shared';

describe('ErrorService', () => {
  let service: ErrorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ErrorService]
    });
    service = TestBed.inject(ErrorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should be a singleton', () => {
      const service2 = TestBed.inject(ErrorService);
      expect(service).toBe(service2);
    });
  });

  describe('translate method - App Errors', () => {
    it('should translate UNAUTHORIZED error', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.UNAUTHORIZED);
      expect(result).toBe('Your session has expired, please log in again');
    });

    it('should translate FAILED_PROVISIONING_CLAIM_CREATION error', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.FAILED_PROVISIONING_CLAIM_CREATION);
      expect(result).toBe('An error occurred while creating device provisioning claim');
    });

    it('should translate FAILED_EXISTING_THING_CHECK error', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.FAILED_EXISTING_THING_CHECK);
      expect(result).toBe('An error occurred while checking your devices\' inventory');
    });

    it('should translate THING_ALREADY_EXISTS error', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.THING_ALREADY_EXISTS);
      expect(result).toBe('The device you are trying to provision already exists in your inventory');
    });

    it('should translate THING_ALREADY_EXISTS_IN_OTHER_ORGANIZATION error', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.THING_ALREADY_EXISTS_IN_OTHER_ORGANIZATION);
      expect(result).toBe('The device you are trying to provision already exists in another organization');
    });

    it('should translate GENERIC_ERROR error', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.GENERIC_ERROR);
      expect(result).toBe('An error occurred, please try again later');
    });

    it('should translate FAILED_COMPANY_UPDATE error', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.FAILED_COMPANY_UPDATE);
      expect(result).toBe('An error occurred while updating company information');
    });

    it('should translate FAILED_COMPANY_RETRIEVAL error', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.FAILED_COMPANY_RETRIEVAL);
      expect(result).toBe('An error occurred while retrieving company information');
    });
  });

  describe('translate method - Device Errors', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should translate CIPHERING_INITIALIZATION_ERROR', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.CIPHERING_INITIALIZATION_ERROR);
      expect(result).toBe('Device errored while initializing ciphering');
      expect(console.log).toHaveBeenCalledWith('TRANSLATE: ', ErrorType.DEVICE_ERROR, DeviceErrorType.CIPHERING_INITIALIZATION_ERROR);
    });

    it('should translate INVALID_WIFI_CREDENTIALS error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.INVALID_WIFI_CREDENTIALS);
      expect(result).toBe('Cannot connect to WiFi with the provided credentials');
      expect(console.log).toHaveBeenCalledWith('TRANSLATE: ', ErrorType.DEVICE_ERROR, DeviceErrorType.INVALID_WIFI_CREDENTIALS);
    });

    it('should translate FAILED_WIFI_CONNECTION_ATTEMPT error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.FAILED_WIFI_CONNECTION_ATTEMPT);
      expect(result).toBe('Cannot connect to WiFi network');
    });

    it('should translate INVALID_DEVICE_PROVISIONING_SETTINGS error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.INVALID_DEVICE_PROVISIONING_SETTINGS);
      expect(result).toBe('Device received invalid TLS certificate or private key');
    });

    it('should translate INVALID_DEVICE_COMMAND error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.INVALID_DEVICE_COMMAND);
      expect(result).toBe('Device received an invalid command via USB');
    });

    it('should translate FAILED_PROVISIONING_SETTINGS_STORAGE error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.FAILED_PROVISIONING_SETTINGS_STORAGE);
      expect(result).toBe('Device errored while attempting to encryot and store TLS certificate and private key');
    });

    it('should translate FAILED_DEVICE_PROVISIONING_ATTEMPT error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.FAILED_DEVICE_PROVISIONING_ATTEMPT);
      expect(result).toBe('Cannot provision device');
    });

    it('should translate FAILED_MQTT_BROKER_CONNECTION error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.FAILED_MQTT_BROKER_CONNECTION);
      expect(result).toBe('Cannot connect device to MQTT broker');
    });

    it('should translate FAILED_DEVICE_CONFIGURATION_RETRIEVAL error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.FAILED_DEVICE_CONFIGURATION_RETRIEVAL);
      expect(result).toBe('Cannot retrieve device configuration');
    });

    it('should translate FAILED_SENSOR_DETECTION_REPORT error', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT);
      expect(result).toBe('Device errored while attempting to publish an alarm report');
    });
  });

  describe('translate method - Edge Cases', () => {
    beforeEach(() => {
      jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    it('should return fallback message for unknown app error code', () => {
      const result = service.translate(ErrorType.APP_ERROR, 999 as AppErrorType);
      expect(result).toBe('An unknown error occurred');
    });

    it('should return fallback message for unknown device error code', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, 999 as DeviceErrorType);
      expect(result).toBe('An unknown error occurred');
      expect(console.log).toHaveBeenCalledWith('TRANSLATE: ', ErrorType.DEVICE_ERROR, 999);
    });

    it('should return fallback message for unknown error type', () => {
      const result = service.translate(999 as ErrorType, AppErrorType.GENERIC_ERROR);
      expect(result).toBe('An unknown error occurred');
    });

    it('should handle null/undefined error codes gracefully', () => {
      const result = service.translate(ErrorType.APP_ERROR, null as any);
      expect(result).toBe('An unknown error occurred');
    });
  });

  describe('translate method - Type Safety', () => {
    it('should handle mixed error types correctly - device error code with app error type', () => {
      // Since enums are numbers, DeviceErrorType.INVALID_WIFI_CREDENTIALS (1) will match AppErrorType.FAILED_PROVISIONING_CLAIM_CREATION (1)
      const result = service.translate(ErrorType.APP_ERROR, DeviceErrorType.INVALID_WIFI_CREDENTIALS as any);
      expect(result).toBe('An error occurred while creating device provisioning claim');
    });

    it('should handle mixed error types correctly - app error code with device error type', () => {
      // Since enums are numbers, AppErrorType.UNAUTHORIZED (0) will match DeviceErrorType.CIPHERING_INITIALIZATION_ERROR (0)
      const result = service.translate(ErrorType.DEVICE_ERROR, AppErrorType.UNAUTHORIZED as any);
      expect(result).toBe('Device errored while initializing ciphering');
    });

    it('should return fallback for non-existent error codes', () => {
      // Test with error codes that don't exist in either enum
      const highErrorCode = 999;
      const appResult = service.translate(ErrorType.APP_ERROR, highErrorCode as any);
      expect(appResult).toBe('An unknown error occurred');
      
      const deviceResult = service.translate(ErrorType.DEVICE_ERROR, highErrorCode as any);
      expect(deviceResult).toBe('An unknown error occurred');
    });
  });

  describe('All Error Codes Coverage', () => {
    it('should have translations for all AppErrorType enum values', () => {
      const appErrorKeys = Object.keys(AppErrorType).filter(key => isNaN(Number(key)));
      
      appErrorKeys.forEach(key => {
        const errorCode = AppErrorType[key as keyof typeof AppErrorType];
        const result = service.translate(ErrorType.APP_ERROR, errorCode);
        expect(result).not.toBe('An unknown error occurred');
        expect(result).toBeTruthy();
      });
    });

    it('should have translations for all DeviceErrorType enum values', () => {
      const deviceErrorKeys = Object.keys(DeviceErrorType).filter(key => isNaN(Number(key)));
      
      deviceErrorKeys.forEach(key => {
        const errorCode = DeviceErrorType[key as keyof typeof DeviceErrorType];
        const result = service.translate(ErrorType.DEVICE_ERROR, errorCode);
        expect(result).not.toBe('An unknown error occurred');
        expect(result).toBeTruthy();
      });
    });
  });

  describe('Error Messages Quality', () => {
    it('should return non-empty error messages', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.GENERIC_ERROR);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should return proper string type', () => {
      const result = service.translate(ErrorType.DEVICE_ERROR, DeviceErrorType.INVALID_WIFI_CREDENTIALS);
      expect(typeof result).toBe('string');
    });

    it('should not return undefined or null', () => {
      const result = service.translate(ErrorType.APP_ERROR, AppErrorType.UNAUTHORIZED);
      expect(result).toBeDefined();
      expect(result).not.toBeNull();
    });
  });
});