import { TestBed } from '@angular/core/testing';
import { DeviceConfigurationService } from './device-configuration.service';
import { MqttService } from '../mqtt/mqtt.service';
import { MqttCommandType, DeviceConfiguration } from '../../models';
import { firstValueFrom, take } from 'rxjs';

describe('DeviceConfigurationService', () => {
  let service: DeviceConfigurationService;
  let mqttServiceSpy: jest.Mocked<MqttService>;

  // Mock DeviceConfiguration using the discriminated union types
  const mockDeviceConfigurationWithDistance: DeviceConfiguration = {
    distance: 100
  };

  const mockDeviceConfigurationWithBeaconUrl: DeviceConfiguration = {
    beaconUrl: 'https://example.com/beacon'
  };

  const mockDeviceConfigurationWithFirmware: DeviceConfiguration = {
    firmware: 'v2.1.0'
  };

  const mockDeviceConfigurationComplete: DeviceConfiguration = {
    distance: 150,
    beaconUrl: 'https://api.example.com/beacon',
    firmware: 'v2.2.0'
  };

  beforeEach(() => {
    const mqttServiceMock = {
      sendCommand: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        DeviceConfigurationService,
        { provide: MqttService, useValue: mqttServiceMock }
      ]
    });

    service = TestBed.inject(DeviceConfigurationService);
    mqttServiceSpy = TestBed.inject(MqttService) as jest.Mocked<MqttService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with null settings', () => {
      expect(service.settings).toBeNull();
    });

    it('should initialize with isBusy as false', async () => {
      const isBusy = await firstValueFrom(service.isBusy$.pipe(take(1)));
      expect(isBusy).toBe(false);
    });

    it('should have settings$ observable initialized', () => {
      expect(service.settings$).toBeDefined();
    });
  });

  describe('loadSettings', () => {
    it('should load settings successfully with distance configuration', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      const result = await service.loadSettings();

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledWith(MqttCommandType.GET_CONFIGURATION);
      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockDeviceConfigurationWithDistance);
      expect(service.settings).toEqual(mockDeviceConfigurationWithDistance);
    });

    it('should load settings successfully with beacon URL configuration', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithBeaconUrl };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      const result = await service.loadSettings();

      expect(result).toEqual(mockDeviceConfigurationWithBeaconUrl);
      expect(service.settings).toEqual(mockDeviceConfigurationWithBeaconUrl);
    });

    it('should load settings successfully with firmware configuration', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithFirmware };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      const result = await service.loadSettings();

      expect(result).toEqual(mockDeviceConfigurationWithFirmware);
      expect(service.settings).toEqual(mockDeviceConfigurationWithFirmware);
    });

    it('should load settings successfully with complete configuration', async () => {
      const mockResponse = { data: mockDeviceConfigurationComplete };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      const result = await service.loadSettings();

      expect(result).toEqual(mockDeviceConfigurationComplete);
      expect(service.settings).toEqual(mockDeviceConfigurationComplete);
    });

    it('should update settings$ observable when loading succeeds', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.loadSettings();

      const settings = await firstValueFrom(service.settings$.pipe(take(1)));
      expect(settings).toEqual(mockDeviceConfigurationWithDistance);
    });

    it('should set isBusy to true during loading and false after completion', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      const loadPromise = service.loadSettings();

      // Should be busy during loading
      const isBusyDuringLoad = await firstValueFrom(service.isBusy$.pipe(take(1)));
      expect(isBusyDuringLoad).toBe(true);

      await loadPromise;

      // Should not be busy after completion
      const isBusyAfterLoad = await firstValueFrom(service.isBusy$.pipe(take(1)));
      expect(isBusyAfterLoad).toBe(false);
    });

    it('should retry on failure with exponential backoff', async () => {
      const error = new Error('Network error');
      mqttServiceSpy.sendCommand
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValue({ data: mockDeviceConfigurationWithDistance });

      const startTime = Date.now();
      const result = await service.loadSettings(3, 100);
      const endTime = Date.now();

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledTimes(3);
      expect(result).toEqual(mockDeviceConfigurationWithDistance);
      
      // Should have waited for exponential backoff (100ms + 200ms = 300ms minimum)
      expect(endTime - startTime).toBeGreaterThan(250);
    });

    it('should throw error after max retries exceeded', async () => {
      const error = new Error('Persistent network error');
      mqttServiceSpy.sendCommand.mockRejectedValue(error);

      await expect(service.loadSettings(2, 100)).rejects.toThrow('Persistent network error');
      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledTimes(2);
    });

    it('should set isBusy to false even when loading fails', async () => {
      const error = new Error('Network error');
      mqttServiceSpy.sendCommand.mockRejectedValue(error);

      try {
        await service.loadSettings(1, 100);
      } catch (e) {
        // Expected to throw
      }

      const isBusyAfterError = await firstValueFrom(service.isBusy$.pipe(take(1)));
      expect(isBusyAfterError).toBe(false);
    });

    it('should use default retry parameters when not specified', async () => {
      const error = new Error('Network error');
      mqttServiceSpy.sendCommand.mockRejectedValue(error);

      try {
        await service.loadSettings();
      } catch (e) {
        // Expected to throw after 3 retries
      }

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledTimes(3);
    });

    it('should handle GET_CONFIGURATION command type correctly', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.loadSettings();

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledWith(MqttCommandType.GET_CONFIGURATION);
      expect(MqttCommandType.GET_CONFIGURATION).toBeDefined();
    });
  });

  describe('saveSettings', () => {
    it('should save distance configuration successfully', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.saveSettings(mockDeviceConfigurationWithDistance);

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledWith(
        MqttCommandType.SET_CONFIGURATION,
        { ...mockDeviceConfigurationWithDistance }
      );
      expect(service.settings).toEqual(mockDeviceConfigurationWithDistance);
    });

    it('should save beacon URL configuration successfully', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithBeaconUrl };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.saveSettings(mockDeviceConfigurationWithBeaconUrl);

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledWith(
        MqttCommandType.SET_CONFIGURATION,
        { ...mockDeviceConfigurationWithBeaconUrl }
      );
      expect(service.settings).toEqual(mockDeviceConfigurationWithBeaconUrl);
    });

    it('should save firmware configuration successfully', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithFirmware };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.saveSettings(mockDeviceConfigurationWithFirmware);

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledWith(
        MqttCommandType.SET_CONFIGURATION,
        { ...mockDeviceConfigurationWithFirmware }
      );
      expect(service.settings).toEqual(mockDeviceConfigurationWithFirmware);
    });

    it('should save complete configuration successfully', async () => {
      const mockResponse = { data: mockDeviceConfigurationComplete };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.saveSettings(mockDeviceConfigurationComplete);

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledWith(
        MqttCommandType.SET_CONFIGURATION,
        { ...mockDeviceConfigurationComplete }
      );
      expect(service.settings).toEqual(mockDeviceConfigurationComplete);
    });

    it('should update settings$ observable when saving succeeds', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.saveSettings(mockDeviceConfigurationWithDistance);

      const settings = await firstValueFrom(service.settings$.pipe(take(1)));
      expect(settings).toEqual(mockDeviceConfigurationWithDistance);
    });

    it('should set isBusy to true during saving and false after completion', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      const savePromise = service.saveSettings(mockDeviceConfigurationWithDistance);

      // Should be busy during saving
      const isBusyDuringSave = await firstValueFrom(service.isBusy$.pipe(take(1)));
      expect(isBusyDuringSave).toBe(true);

      await savePromise;

      // Should not be busy after completion
      const isBusyAfterSave = await firstValueFrom(service.isBusy$.pipe(take(1)));
      expect(isBusyAfterSave).toBe(false);
    });

    it('should handle save errors gracefully', async () => {
      const error = new Error('Save failed');
      mqttServiceSpy.sendCommand.mockRejectedValue(error);

      // Should not throw, but handle error internally
      await expect(service.saveSettings(mockDeviceConfigurationWithDistance)).resolves.toBeUndefined();
    });

    it('should set isBusy to false even when saving fails', async () => {
      const error = new Error('Save failed');
      mqttServiceSpy.sendCommand.mockRejectedValue(error);

      await service.saveSettings(mockDeviceConfigurationWithDistance);

      const isBusyAfterError = await firstValueFrom(service.isBusy$.pipe(take(1)));
      expect(isBusyAfterError).toBe(false);
    });

    it('should not update settings when save fails', async () => {
      const error = new Error('Save failed');
      mqttServiceSpy.sendCommand.mockRejectedValue(error);

      await service.saveSettings(mockDeviceConfigurationWithDistance);

      expect(service.settings).toBeNull();
    });

    it('should handle SET_CONFIGURATION command type correctly', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.saveSettings(mockDeviceConfigurationWithDistance);

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledWith(MqttCommandType.SET_CONFIGURATION, expect.any(Object));
      expect(MqttCommandType.SET_CONFIGURATION).toBeDefined();
    });

    it('should spread configuration object correctly', async () => {
      const mockResponse = { data: mockDeviceConfigurationComplete };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.saveSettings(mockDeviceConfigurationComplete);

      expect(mqttServiceSpy.sendCommand).toHaveBeenCalledWith(
        MqttCommandType.SET_CONFIGURATION,
        {
          distance: 150,
          beaconUrl: 'https://api.example.com/beacon',
          firmware: 'v2.2.0'
        }
      );
    });
  });

  describe('settings getter', () => {
    it('should return current settings value', () => {
      // Initially null
      expect(service.settings).toBeNull();

      // After setting via private subject
      service['_settings$'].next(mockDeviceConfigurationWithDistance);
      expect(service.settings).toEqual(mockDeviceConfigurationWithDistance);
    });

    it('should return null when no settings are loaded', () => {
      expect(service.settings).toBeNull();
    });

    it('should return the last saved configuration', () => {
      service['_settings$'].next(mockDeviceConfigurationWithBeaconUrl);
      expect(service.settings).toEqual(mockDeviceConfigurationWithBeaconUrl);

      service['_settings$'].next(mockDeviceConfigurationWithFirmware);
      expect(service.settings).toEqual(mockDeviceConfigurationWithFirmware);
    });
  });

  describe('Observable behavior', () => {
    it('should emit settings changes to subscribers', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      await service.loadSettings();

      const finalSettings = await firstValueFrom(service.settings$.pipe(take(1)));
      expect(finalSettings).toEqual(mockDeviceConfigurationWithDistance);
    });

    it('should emit busy state changes to subscribers', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      const busyStates: boolean[] = [];
      const subscription = service.isBusy$.subscribe(isBusy => {
        busyStates.push(isBusy);
      });

      await service.loadSettings();

      subscription.unsubscribe();

      // Should have: false (initial), true (during load), false (after load)
      expect(busyStates).toEqual([false, true, false]);
    });

    it('should handle multiple subscribers correctly', async () => {
      const mockResponse = { data: mockDeviceConfigurationWithDistance };
      mqttServiceSpy.sendCommand.mockResolvedValue(mockResponse);

      const subscriber1Values: (DeviceConfiguration | null)[] = [];
      const subscriber2Values: (DeviceConfiguration | null)[] = [];

      const sub1 = service.settings$.subscribe(settings => {
        subscriber1Values.push(settings);
      });

      const sub2 = service.settings$.subscribe(settings => {
        subscriber2Values.push(settings);
      });

      await service.loadSettings();

      sub1.unsubscribe();
      sub2.unsubscribe();

      expect(subscriber1Values).toEqual([null, mockDeviceConfigurationWithDistance]);
      expect(subscriber2Values).toEqual([null, mockDeviceConfigurationWithDistance]);
    });
  });

  describe('DeviceConfiguration type validation', () => {
    it('should work with distance-only configuration', () => {
      const config: DeviceConfiguration = { distance: 50 };
      expect(config.distance).toBe(50);
      expect(config.beaconUrl).toBeUndefined();
      expect(config.firmware).toBeUndefined();
    });

    it('should work with beaconUrl-only configuration', () => {
      const config: DeviceConfiguration = { beaconUrl: 'https://test.com' };
      expect(config.beaconUrl).toBe('https://test.com');
      expect(config.distance).toBeUndefined();
      expect(config.firmware).toBeUndefined();
    });

    it('should work with firmware-only configuration', () => {
      const config: DeviceConfiguration = { firmware: 'v1.0.0' };
      expect(config.firmware).toBe('v1.0.0');
      expect(config.distance).toBeUndefined();
      expect(config.beaconUrl).toBeUndefined();
    });

    it('should work with multiple properties', () => {
      const config: DeviceConfiguration = { 
        distance: 100, 
        beaconUrl: 'https://test.com',
        firmware: 'v1.0.0'
      };
      expect(config.distance).toBe(100);
      expect(config.beaconUrl).toBe('https://test.com');
      expect(config.firmware).toBe('v1.0.0');
    });
  });
});