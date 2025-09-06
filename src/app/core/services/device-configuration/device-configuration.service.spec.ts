import { TestBed } from '@angular/core/testing';

import { DeviceConfigurationService } from './device-configuration.service';
import { MqttService } from '@services/mqtt/mqtt.service';
import { MqttCommandType,
         DeviceConfiguration } from '@models';


describe('DeviceConfigurationService', () => {

  let service: DeviceConfigurationService;
  let mqttServiceMock: { sendCommand: jest.Mock };

  const config1: DeviceConfiguration = { distance: 100 };
  const config2: DeviceConfiguration = { beaconUrl: 'url' };
  const config3: DeviceConfiguration = { firmware: 'v1.0.0' };
  const configAll: DeviceConfiguration = { distance: 50, beaconUrl: 'url', firmware: 'v2.0.0' };

  beforeEach(() => {
    mqttServiceMock = { sendCommand: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        DeviceConfigurationService,
        { provide: MqttService, useValue: mqttServiceMock }
      ]
    });
    service = TestBed.inject(DeviceConfigurationService);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.settings()).toBeNull();
    expect(service.isBusy()).toBe(false);
  });

  it('should load settings and update signal', async () => {
    mqttServiceMock.sendCommand.mockResolvedValue({ data: config1 });
    const result = await service.loadSettings();
    expect(result).toEqual(config1);
    expect(service.settings()).toEqual(config1);
    expect(mqttServiceMock.sendCommand).toHaveBeenCalledWith(MqttCommandType.GET_CONFIGURATION);
  });

  it('should set isBusy true during load and false after', async () => {
    mqttServiceMock.sendCommand.mockResolvedValue({ data: config1 });
    const promise = service.loadSettings();
    expect(service.isBusy()).toBe(true);
    await promise;
    expect(service.isBusy()).toBe(false);
  });

  it('should retry on failure and succeed', async () => {
    mqttServiceMock.sendCommand
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ data: config2 });
    const result = await service.loadSettings(2, 1);
    expect(result).toEqual(config2);
    expect(mqttServiceMock.sendCommand).toHaveBeenCalledTimes(2);
  });

  it('should throw after max retries', async () => {
    mqttServiceMock.sendCommand.mockRejectedValue(new Error('fail'));
    await expect(service.loadSettings(2, 1)).rejects.toThrow('fail');
    expect(service.isBusy()).toBe(false);
  });

  it('should set isBusy false after error', async () => {
    mqttServiceMock.sendCommand.mockRejectedValue(new Error('fail'));
    try { await service.loadSettings(1, 1); } catch {}
    expect(service.isBusy()).toBe(false);
  });

  it('should save settings and update signal', async () => {
    mqttServiceMock.sendCommand.mockResolvedValue({ data: config3 });
    const result = await service.saveSettings(config3);
    expect(result).toEqual(config3);
    expect(service.settings()).toEqual(config3);
    expect(mqttServiceMock.sendCommand).toHaveBeenCalledWith(MqttCommandType.SET_CONFIGURATION, config3);
  });

  it('should set isBusy true during save and false after', async () => {
    mqttServiceMock.sendCommand.mockResolvedValue({ data: configAll });
    const promise = service.saveSettings(configAll);
    expect(service.isBusy()).toBe(true);
    await promise;
    expect(service.isBusy()).toBe(false);
  });

  it('should handle save error and set isBusy false', async () => {
    mqttServiceMock.sendCommand.mockRejectedValue(new Error('fail'));
    await expect(service.saveSettings(config1)).rejects.toThrow('fail');
    expect(service.isBusy()).toBe(false);
  });

  it('should update settings signal on save', async () => {
    mqttServiceMock.sendCommand.mockResolvedValue({ data: configAll });
    await service.saveSettings(configAll);
    expect(service.settings()).toEqual(configAll);
  });

  it('should handle multiple config types', async () => {
    mqttServiceMock.sendCommand.mockResolvedValue({ data: config1 });
    await service.saveSettings(config1);
    expect(service.settings()).toEqual(config1);
    mqttServiceMock.sendCommand.mockResolvedValue({ data: config2 });
    await service.saveSettings(config2);
    expect(service.settings()).toEqual(config2);
    mqttServiceMock.sendCommand.mockResolvedValue({ data: config3 });
    await service.saveSettings(config3);
    expect(service.settings()).toEqual(config3);
  });
  
});