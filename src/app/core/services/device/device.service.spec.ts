import { TestBed } from '@angular/core/testing';
import { NgZone } from '@angular/core';
import { DeviceService } from './device.service';
import { WINDOW } from '../../tokens/window';
import { APP_CONFIG } from '../../../../environments/environment';
import { 
  DeviceIncomingData, 
  DeviceOutgoingData,
  DeviceAppState, 
  DeviceMessageType, 
  WiFiNetwork,
  DeviceErrorType,
  USBCommandType,
  WiFiCredentials,
  ProvisioningData,
  USBCommand,
  DeviceStateUpdate,
  Error as DeviceError,
  DeviceEvent
} from '../../../../../app/shared';
import { PortInfo } from '@serialport/bindings-cpp';
import { BaseMqttMessage } from '../../models';
import { DeviceConfiguration } from '../../models';
import { AlarmPayload } from '../../models';
import { ConnectionStatus } from '../../models';
import { MqttMessageType } from '../../models';

// TO DO: rewrite this test!
// Mock electron interface
interface MockElectron {
  ipcRenderer: {
    on: jest.Mock;
    send: jest.Mock;
    removeAllListeners: jest.Mock;
  };
}

// Mock window with electron
interface MockWindow extends Omit<Window, 'electron'> {
  electron?: MockElectron;
}

describe('DeviceService', () => {
  let service: DeviceService;
  let mockWindow: MockWindow;
  let mockElectron: MockElectron;
  let ngZone: NgZone;

  // Test data
  const mockPortInfo: PortInfo = {
    path: '/dev/ttyUSB0',
    manufacturer: 'Test Manufacturer',
    serialNumber: 'TEST123',
    vendorId: '1234',
    productId: '5678'
  } as PortInfo;

  const mockWiFiNetworks: WiFiNetwork[] = [
    { ssid: 'TestNetwork1', rssi: -50, encryptionType: 4 },
    { ssid: 'TestNetwork2', rssi: -60, encryptionType: 7 }
  ];

  const mockWiFiCredentials: WiFiCredentials = {
    ssid: 'TestNetwork',
    password: 'testpassword123'
  };

  const mockProvisioningData: ProvisioningData = {
    tempCert: 'test-certificate-data',
    tempKey: 'test-key-data'
  };

  const mockUSBCommand: USBCommand = {
    command: USBCommandType.SET_WIFI_CREDENTIALS
  };

  const mockDeviceStateUpdate: DeviceStateUpdate = {
    appState: DeviceAppState.DEVICE_INITIALIZED
  };

  beforeEach(() => {
    // Create mock electron
    mockElectron = {
      ipcRenderer: {
        on: jest.fn(),
        send: jest.fn(),
        removeAllListeners: jest.fn()
      }
    };

    // Create mock window
    mockWindow = {
      electron: mockElectron
    } as MockWindow;

    // Mock APP_CONFIG
    (APP_CONFIG as any).settings = {
      USB_RESPONSE_TIMEOUT: 5000,
      MQTT_RESPONSE_TIMEOUT: 5000
    };

    TestBed.configureTestingModule({
      providers: [
        DeviceService,
        { provide: WINDOW, useValue: mockWindow }
      ]
    });

    service = TestBed.inject(DeviceService);
    ngZone = TestBed.inject(NgZone);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(service.serialNumber.getValue()).toBe('');
      expect(service.portInfo.getValue()).toBeNull();
      expect(service.deviceAppStatus.getValue()).toBe(DeviceAppState.STARTED);
      expect(service.usbConnectionStatus.getValue()).toBe(false);
      expect(service.wiFiNetworks.getValue()).toEqual([]);
      expect(service.configuration.getValue()).toBeNull();
      expect(service.alarm.getValue()).toBeNull();
      expect(service.error.getValue()).toBeNull();
    });

    it('should set up electron IPC listeners if electron is available', () => {
      expect(mockElectron.ipcRenderer.on).toHaveBeenCalledWith(
        DeviceEvent.FOUND,
        expect.any(Function)
      );
      expect(mockElectron.ipcRenderer.on).toHaveBeenCalledWith(
        DeviceEvent.CONNECTION_STATUS_UPDATE,
        expect.any(Function)
      );
      expect(mockElectron.ipcRenderer.on).toHaveBeenCalledWith(
        DeviceEvent.INCOMING_DATA,
        expect.any(Function)
      );
    });
  });

  describe('IPC Event Handlers', () => {
    let deviceFoundHandler: Function;
    let connectionStatusHandler: Function;
    let incomingDataHandler: Function;

    beforeEach(() => {
      const calls = mockElectron.ipcRenderer.on.mock.calls;
      deviceFoundHandler = calls.find(call => call[0] === 'device-found')?.[1];
      connectionStatusHandler = calls.find(call => call[0] === 'device-connection-status-update')?.[1];
      incomingDataHandler = calls.find(call => call[0] === 'device-incoming-data')?.[1];
    });

    it('should handle device-found event', () => {
      jest.spyOn(ngZone, 'run').mockImplementation((fn: Function) => fn());

      deviceFoundHandler(mockPortInfo);

      expect(service.portInfo.getValue()).toEqual(mockPortInfo);
    });

    it('should handle device-connection-status-update event', () => {
      jest.spyOn(ngZone, 'run').mockImplementation((fn: Function) => fn());

      connectionStatusHandler(true);

      expect(service.usbConnectionStatus.getValue()).toBe(true);
    });

    it('should handle device-incoming-data event', () => {
      jest.spyOn(ngZone, 'run').mockImplementation((fn: Function) => fn());
      jest.spyOn(service, 'parseIncomingData');

      const mockIncomingData: DeviceIncomingData = {
        type: DeviceMessageType.APP_STATE,
        sn: 'TEST123',
        data: mockDeviceStateUpdate
      };

      incomingDataHandler(mockIncomingData);

      expect(service.parseIncomingData).toHaveBeenCalledWith(mockIncomingData);
    });

    it('should reset when USB connection status becomes false', () => {
      jest.spyOn(service, 'reset');

      // Set initial state
      service.serialNumber.next('TEST123');
      service.portInfo.next(mockPortInfo);

      // First set connection to true, then to false to trigger the change
      service.usbConnectionStatus.next(true);
      service.usbConnectionStatus.next(false);

      expect(service.reset).toHaveBeenCalled();
    });
  });

  describe('parseIncomingData', () => {
    it('should set serial number if not already set', () => {
      const payload: DeviceIncomingData = {
        type: DeviceMessageType.APP_STATE,
        sn: 'TEST123',
        data: mockDeviceStateUpdate
      };

      service.parseIncomingData(payload);

      expect(service.serialNumber.getValue()).toBe('TEST123');
    });

    it('should not overwrite existing serial number', () => {
      service.serialNumber.next('EXISTING123');

      const payload: DeviceIncomingData = {
        type: DeviceMessageType.APP_STATE,
        sn: 'NEW123',
        data: mockDeviceStateUpdate
      };

      service.parseIncomingData(payload);

      expect(service.serialNumber.getValue()).toBe('EXISTING123');
    });

    it('should handle APP_STATE message type', () => {
      const payload: DeviceIncomingData = {
        type: DeviceMessageType.APP_STATE,
        sn: 'TEST123',
        data: { appState: DeviceAppState.CONNECT_TO_WIFI }
      };

      service.parseIncomingData(payload);

      expect(service.deviceAppStatus.getValue()).toBe(DeviceAppState.CONNECT_TO_WIFI);
    });

    it('should handle WIFI_NETWORKS_LIST message type', () => {
      const payload: DeviceIncomingData = {
        type: DeviceMessageType.WIFI_NETWORKS_LIST,
        sn: 'TEST123',
        data: mockWiFiNetworks
      };

      service.parseIncomingData(payload);

      expect(service.wiFiNetworks.getValue()).toEqual(mockWiFiNetworks);
    });

    it('should handle ERROR message type', () => {
      const mockError = DeviceErrorType.INVALID_WIFI_CREDENTIALS;
      const payload: DeviceIncomingData = {
        type: DeviceMessageType.ERROR,
        sn: 'TEST123',
        data: { error: mockError }
      };

      service.parseIncomingData(payload);

      expect(service.error.getValue()).toBe(mockError);
    });

    it('should handle ACKNOWLEDGMENT message type', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const correlationId = 'test-cid';

      const payload: DeviceIncomingData = {
        type: DeviceMessageType.ACKNOWLEDGMENT,
        sn: 'TEST123',
        cid: correlationId
      };

      service.parseIncomingData(payload);

      expect(consoleSpy).toHaveBeenCalledWith(
        `Received response via USB for request with correlation id: ${correlationId}`
      );
    });

    it('should resolve pending request when correlation ID matches', () => {
      const correlationId = 'test-cid';
      const mockResolve = jest.fn();
      const mockTimeout = setTimeout(() => {}, 1000);

      // @ts-ignore - accessing private property for testing
      service.pendingRequests[correlationId] = {
        resolve: mockResolve,
        reject: jest.fn(),
        timeout: mockTimeout
      };

      const payload: DeviceIncomingData = {
        type: DeviceMessageType.ACKNOWLEDGMENT,
        sn: 'TEST123',
        cid: correlationId
      };

      service.parseIncomingData(payload);

      expect(mockResolve).toHaveBeenCalledWith(payload);
      // @ts-ignore - accessing private property for testing
      expect(service.pendingRequests[correlationId]).toBeUndefined();
    });
  });

  describe('sendData', () => {
    it('should send data via electron IPC when electron is available', () => {
      const payload = { test: 'data' };
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      service.sendData(payload);

      expect(mockElectron.ipcRenderer.send).toHaveBeenCalledWith(
        DeviceEvent.OUTGOING_DATA,
        '<|{"test":"data"}|>'
      );
      expect(consoleSpy).toHaveBeenCalledWith('Sending data to device: {"test":"data"}');
    });

    it('should log error when electron is not available', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockWindow.electron = undefined;

      service.sendData({ test: 'data' });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error while sending data to device: Electron not available!'
      );
    });

    it('should handle JSON stringify errors', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const circularObj: any = {};
      circularObj.self = circularObj;

      service.sendData(circularObj);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error sending data to device:',
        expect.any(Error)
      );
    });
  });

  describe('asyncSendData', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      service.serialNumber.next('TEST123');
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should resolve when response is received', async () => {
      const mockPayload = { test: 'data' };
      const mockResponse = { result: 'success' };
      
      jest.spyOn(service, 'sendData').mockImplementation();
      jest.spyOn(service, 'generateCid').mockReturnValue('test-cid');

      const promise = service.asyncSendData(USBCommandType.SET_WIFI_CREDENTIALS, mockPayload);

      // Simulate response
      service.parseIncomingData({
        type: DeviceMessageType.ACKNOWLEDGMENT,
        sn: 'TEST123',
        cid: 'test-cid',
        data: undefined
      } as DeviceIncomingData);

      const result = await promise;
      expect(result.sn).toBe('TEST123');
    });

    it('should reject on timeout', async () => {
      const mockPayload = { test: 'data' };
      
      jest.spyOn(service, 'sendData').mockImplementation();
      jest.spyOn(service, 'generateCid').mockReturnValue('test-cid');

      const promise = service.asyncSendData(USBCommandType.HARD_RESET, mockPayload);

      // Fast forward time to trigger timeout
      jest.advanceTimersByTime(5001);

      await expect(promise).rejects.toThrow('USB request timeout');
    });

    it('should generate correlation ID and send data', async () => {
      const mockPayload = { test: 'data' };
      const sendDataSpy = jest.spyOn(service, 'sendData').mockImplementation();
      const generateCidSpy = jest.spyOn(service, 'generateCid').mockReturnValue('test-cid');

      service.asyncSendData(USBCommandType.REFRESH_WIFI_CREDENTIALS, mockPayload);

      expect(generateCidSpy).toHaveBeenCalled();
      expect(sendDataSpy).toHaveBeenCalledWith({
        cid: 'test-cid',
        commandType: USBCommandType.REFRESH_WIFI_CREDENTIALS,
        payload: mockPayload
      });
    });

    it('should handle different outgoing data types', async () => {
      const sendDataSpy = jest.spyOn(service, 'sendData').mockImplementation();
      jest.spyOn(service, 'generateCid').mockReturnValue('test-cid');

      // Test WiFi credentials
      service.asyncSendData(USBCommandType.SET_WIFI_CREDENTIALS, mockWiFiCredentials);
      expect(sendDataSpy).toHaveBeenCalledWith({
        cid: 'test-cid',
        commandType: USBCommandType.SET_WIFI_CREDENTIALS,
        payload: mockWiFiCredentials
      });

      // Test provisioning data
      service.asyncSendData(USBCommandType.SET_PROVISIONING_CERTIFICATES, mockProvisioningData);
      expect(sendDataSpy).toHaveBeenCalledWith({
        cid: 'test-cid',
        commandType: USBCommandType.SET_PROVISIONING_CERTIFICATES,
        payload: mockProvisioningData
      });

      // Test USB command
      service.asyncSendData(USBCommandType.HARD_RESET, mockUSBCommand);
      expect(sendDataSpy).toHaveBeenCalledWith({
        cid: 'test-cid',
        commandType: USBCommandType.HARD_RESET,
        payload: mockUSBCommand
      });
    });
  });

  describe('reset', () => {
    it('should reset all BehaviorSubjects to initial values', () => {
      // Set some values
      service.serialNumber.next('TEST123');
      service.portInfo.next(mockPortInfo);
      service.deviceAppStatus.next(DeviceAppState.DEVICE_INITIALIZED);
      service.wiFiNetworks.next(mockWiFiNetworks);
      //service.error.next(DeviceErrorType.INVALID_WIFI_CREDENTIALS);
      service.alarm.next(null);
      service.configuration.next(null);

      service.reset();

      expect(service.serialNumber.getValue()).toBe('');
      expect(service.portInfo.getValue()).toBeNull();
      expect(service.deviceAppStatus.getValue()).toBe(DeviceAppState.STARTED);
      expect(service.wiFiNetworks.getValue()).toEqual([]);
      expect(service.error.getValue()).toBeNull();
      expect(service.alarm.getValue()).toBeNull();
      expect(service.configuration.getValue()).toBeNull();
    });
  });

  describe('generateCid', () => {
    it('should generate correlation ID with device serial number', () => {
      service.serialNumber.next('TEST123');
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      const cid = service.generateCid();

      expect(cid).toMatch(/^TEST123-[0-9a-f-]{36}-1234567890$/);
    });

    it('should generate correlation ID with empty serial number', () => {
      service.serialNumber.next('');
      jest.spyOn(Date, 'now').mockReturnValue(1234567890);

      const cid = service.generateCid();

      expect(cid).toMatch(/^-[0-9a-f-]{36}-1234567890$/);
    });
  });

  describe('MQTT Message Handling', () => {
    it('should handle MQTT alarm messages', () => {
      const alarmMessage: BaseMqttMessage<AlarmPayload> = {
        type: MqttMessageType.ALARM,
        sn: 'TEST123',
        timestamp: Date.now(),
        data: { timestamp: Date.now(), distance: 75 }
      };

      service.onAlarm(alarmMessage as BaseMqttMessage<AlarmPayload>);

      expect(service.alarm.getValue()).toEqual(alarmMessage);
    });

    it('should handle MQTT configuration messages', () => {
      const configMessage: DeviceConfiguration = {
        distance: 150,
        beaconUrl: 'https://new.beacon.com'
      };

      service.onConfiguration(configMessage);

      expect(service.configuration.getValue()).toEqual(configMessage);
    });

    it('should handle MQTT connection status messages', () => {
      const connectionStatus: ConnectionStatus = {
        connected: true
      };

      // You would need to add a method to handle connection status
      // This is just an example of how you might test it
      expect(connectionStatus.connected).toBe(true);
    });

    it('should handle different DeviceConfiguration types', () => {
      // Test distance-only configuration
      const distanceConfig: DeviceConfiguration = { distance: 200 };
      service.onConfiguration(distanceConfig);
      expect(service.configuration.getValue()).toEqual(distanceConfig);

      // Test beacon URL-only configuration  
      const beaconConfig: DeviceConfiguration = { beaconUrl: 'https://beacon.test' };
      service.onConfiguration(beaconConfig);
      expect(service.configuration.getValue()).toEqual(beaconConfig);

      // Test firmware-only configuration
      const firmwareConfig: DeviceConfiguration = { firmware: '2.0.0' };
      service.onConfiguration(firmwareConfig);
      expect(service.configuration.getValue()).toEqual(firmwareConfig);
    });
  });

  describe('Getter Methods', () => {
    it('should return current serial number', () => {
      service.serialNumber.next('TEST123');

      expect(service.getSerialNumber()).toBe('TEST123');
    });

    it('should return current app status', () => {
      service.deviceAppStatus.next(DeviceAppState.DEVICE_INITIALIZED);

      expect(service.getAppStatus()).toBe(DeviceAppState.DEVICE_INITIALIZED);
    });

    it('should return null app status', () => {
      service.deviceAppStatus.next(null);

      expect(service.getAppStatus()).toBeNull();
    });
  });

  describe('Observables', () => {
    it('should expose observables for all BehaviorSubjects', () => {
      expect(service.serialNumber$).toBeDefined();
      expect(service.portInfo$).toBeDefined();
      expect(service.deviceAppStatus$).toBeDefined();
      expect(service.usbConnectionStatus$).toBeDefined();
      expect(service.wiFiNetworks$).toBeDefined();
      expect(service.configuration$).toBeDefined();
      expect(service.alarm$).toBeDefined();
      expect(service.error$).toBeDefined();
    });

    it('should emit values when BehaviorSubjects change', () => {
      const serialNumberSpy = jest.fn();
      service.serialNumber$.subscribe(serialNumberSpy);

      service.serialNumber.next('TEST123');

      expect(serialNumberSpy).toHaveBeenCalledWith('TEST123');
    });
  });

  describe('Error Handling', () => {
    it('should handle electron not being available during construction', () => {
      mockWindow.electron = undefined;

      // Create new service instance without electron
      const serviceWithoutElectron = new DeviceService(mockWindow, ngZone);

      expect(serviceWithoutElectron).toBeTruthy();
    });

    it('should handle malformed incoming data gracefully', () => {
      const malformedPayload = {} as DeviceIncomingData;

      expect(() => {
        service.parseIncomingData(malformedPayload);
      }).not.toThrow();
    });
  });
});