import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { MqttService } from './mqtt.service';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';
import { SigV4Service } from '../sig-v4/sig-v4.service';
import { MqttMessageType, MqttCommandType, AlarmPayload, DeviceConfiguration, BaseMqttMessage } from '../../models';
import { AuthSession } from 'aws-amplify/auth';
import { NgZone } from '@angular/core';
import mqtt from 'mqtt';
import { APP_CONFIG } from '../../../../environments/environment';

// Mock mqtt module for all tests
const mockMqttClient = {
  connected: false,
  on: jest.fn(),
  once: jest.fn(),
  off: jest.fn(),
  subscribe: jest.fn(),
  publish: jest.fn(),
  end: jest.fn(),
  removeAllListeners: jest.fn()
};

jest.mock('mqtt', () => {
  const mockConnect = jest.fn(() => mockMqttClient);
  return {
    __esModule: true,
    default: {
      connect: mockConnect
    }
  };
});

// Get reference to the mocked mqtt.connect function
const mockedMqtt = mqtt as jest.Mocked<typeof mqtt>;
const mockMqttConnect = mockedMqtt.connect;

// Mock APP_CONFIG
jest.mock('../../../../environments/environment', () => ({
  APP_CONFIG: {
    aws: {
      apiGateway: 'https://api.example.com',
      IoTCore: {
        endpoint: 'wss://iot.example.com',
        service: 'iot',
      },
      algorithm: 'AWS4-HMAC-SHA256',
      region: 'us-east-1',
    },
    settings: {
      MQTT_RESPONSE_TIMEOUT: 5000
    }
  }
}));

// Mock AWS Amplify modules
jest.mock('aws-amplify/auth', () => ({
  fetchAuthSession: jest.fn(),
  getCurrentUser: jest.fn(),
  fetchUserAttributes: jest.fn()
}));

jest.mock('aws-amplify', () => ({
  Amplify: {
    configure: jest.fn()
  }
}));

jest.mock('@aws-amplify/core', () => ({
  Hub: {
    listen: jest.fn()
  }
}));

describe('MqttService', () => {
  let service: MqttService;
  let authService: any;
  let deviceService: any;
  let notificationService: any;
  let sigV4Service: any;
  let mockSession: any;

  beforeEach(() => {
    jest.resetModules(); // Reset module registry to avoid global mock leakage
    
    // Create a simple signal mock 
    const sessionDataSignal = jest.fn(() => null);
    
    authService = {
      sessionData: sessionDataSignal,
      hasPolicy: jest.fn(() => true),
      company: jest.fn(() => 'company')
    };
    deviceService = { 
      onAlarm: jest.fn(), 
      onConfiguration: jest.fn(),
      serialNumber: jest.fn(() => 'device-sn'),
      generateCid: jest.fn(() => 'cid-1')
    };
    notificationService = { notify: jest.fn() };
    sigV4Service = {
      getSignedURL: jest.fn(() => 'wss://test-url')
    };
    mockSession = {
      identityId: 'id-1',
      credentials: {},
      tokens: {
        idToken: { payload: { 'custom:hasPolicy': '1', 'custom:Company': 'company' }, toString: () => '' },
        accessToken: { payload: {}, toString: () => '' }
      },
      userSub: 'sub-1'
    };
    
    TestBed.configureTestingModule({
      providers: [
        MqttService,
        { provide: AuthService, useValue: authService },
        { provide: DeviceService, useValue: deviceService },
        { provide: 'NotificationService', useValue: notificationService },
        { provide: SigV4Service, useValue: sigV4Service }
      ]
    });
    
    service = TestBed.inject(MqttService);
    
    // Mock the effect-related methods to prevent automatic session handling
    jest.spyOn(service as any, 'initializeAuthSubscription').mockImplementation(() => {});
    jest.spyOn(service as any, 'handleSessionChange').mockImplementation(() => Promise.resolve());
    
    jest.clearAllMocks();
    mockMqttConnect.mockClear();
    mockMqttClient.connected = false;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isConnected).toBe(false);
    expect(service.messages$.value).toBeNull();
  });

  it('should connect to MQTT broker', async () => {
    // Reset the client to undefined to allow real connection
    (service as any).client = undefined;
    
    // Mock the once method to handle both connect and error events
    mockMqttClient.once.mockImplementation((event, callback) => {
      if (event === 'connect') {
        setTimeout(() => {
          mockMqttClient.connected = true;
          callback();
        }, 0);
      }
      // Don't call error callback for successful connection
    });
    
    await service.connect(mockSession);
    
    expect(mockMqttConnect).toHaveBeenCalledWith('wss://test-url', expect.any(Object));
    expect(service.isConnected).toBe(true);
  });

  it('should skip connect if user has no policy', async () => {
    authService.hasPolicy.mockReturnValue(false);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    await service.connect(mockSession);
    expect(logSpy).toHaveBeenCalledWith('[MqttService]: user does not have an iot policy attached yet; skipping...');
    logSpy.mockRestore();
  });

  it('should handle connection errors', async () => {
    // Reset the client to undefined to allow real connection
    (service as any).client = undefined;
    
    // Mock the once method to handle both connect and error events
    mockMqttClient.once.mockImplementation((event, callback) => {
      if (event === 'error') {
        setTimeout(() => callback(new Error('fail')), 0);
      }
      // Don't call connect callback for error case
    });
    
    await expect(service.connect(mockSession)).rejects.toThrow('fail');
    expect(service.isConnected).toBe(false);
  });

  it('should disconnect gracefully', async () => {
    // Set the mock client for this test
    (service as any).client = mockMqttClient;
    mockMqttClient.connected = true;
    mockMqttClient.end.mockImplementation((force: any, opts: any, cb: any) => cb());
    await service.disconnect();
    expect(mockMqttClient.removeAllListeners).toHaveBeenCalled();
    expect(mockMqttClient.end).toHaveBeenCalledWith(true, {}, expect.any(Function));
  });

  it('should handle disconnect when not connected', async () => {
    mockMqttClient.connected = false;
    (service as any).client = undefined;
    await service.disconnect();
    expect(mockMqttClient.end).not.toHaveBeenCalled();
  });

  it('should send command successfully', async () => {
    // Reset the client to undefined to allow real connection
    (service as any).client = undefined;
    
    // Mock the once method for successful connection
    mockMqttClient.once.mockImplementation((event, callback) => {
      if (event === 'connect') {
        mockMqttClient.connected = true;
        callback();
      }
    });
    
    await service.connect(mockSession);
    mockMqttClient.publish.mockImplementation((topic: any, msg: any, cb: any) => cb(null));
    
    const promise = service.sendCommand(MqttCommandType.SET_CONFIGURATION, { foo: 'bar' });
    
    // Simulate immediate response
    setTimeout(() => {
      const handle = (service as any).handleIncomingMessage.bind(service);
      handle(Buffer.from(JSON.stringify({ type: MqttMessageType.ACKNOWLEGDE, cid: 'cid-1', sn: 'device-sn', data: { ok: true } })));
    }, 0);
    
    const result = await promise;
    expect(result).toEqual({ type: MqttMessageType.ACKNOWLEGDE, cid: 'cid-1', sn: 'device-sn', data: { ok: true } });
  });

  it('should reject command if not connected', async () => {
    // Ensure client is not connected
    (service as any).client = undefined;
    mockMqttClient.connected = false;
    await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION)).rejects.toThrow('MQTT client is not connected');
  });

  it('should handle publish errors', async () => {
    // Reset the client to undefined to allow real connection
    (service as any).client = undefined;
    
    // Mock the once method for successful connection first
    mockMqttClient.once.mockImplementation((event, callback) => {
      if (event === 'connect') {
        setTimeout(() => {
          mockMqttClient.connected = true;
          callback();
        }, 0);
      }
    });
    
    await service.connect(mockSession);
    mockMqttClient.publish.mockImplementation((topic: any, msg: any, cb: any) => cb(new Error('fail')));
    await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION)).rejects.toThrow('fail');
  });

  it('should handle command timeout', async () => {
    // Reset the client to undefined to allow real connection
    (service as any).client = undefined;
    
    // Mock the once method for successful connection first
    mockMqttClient.once.mockImplementation((event, callback) => {
      if (event === 'connect') {
        mockMqttClient.connected = true;
        callback();
      }
    });
    
    await service.connect(mockSession);
    mockMqttClient.publish.mockImplementation((topic: any, msg: any, cb: any) => cb(null));
    
    // Override the timeout to be very short for testing
    const originalTimeout = (APP_CONFIG as any).settings.MQTT_RESPONSE_TIMEOUT;
    (APP_CONFIG as any).settings.MQTT_RESPONSE_TIMEOUT = 10; // 10ms timeout
    
    try {
      const promise = service.sendCommand(MqttCommandType.SET_CONFIGURATION);
      await expect(promise).rejects.toThrow('MQTT request timeout');
    } finally {
      // Restore original timeout
      (APP_CONFIG as any).settings.MQTT_RESPONSE_TIMEOUT = originalTimeout;
    }
  }, 1000); // 1 second test timeout

  it('should handle incoming alarm/configuration/ack messages', () => {
    // Set the mock client for this test
    (service as any).client = mockMqttClient;
    
    const now = Date.now();
    const alarmMsg: BaseMqttMessage<AlarmPayload> & { type: MqttMessageType.ALARM } = { type: MqttMessageType.ALARM, sn: 'sn', data: {} as any, timestamp: now };
    const configMsg: BaseMqttMessage<DeviceConfiguration> & { type: MqttMessageType.CONFIGURATION } = { type: MqttMessageType.CONFIGURATION, sn: 'sn', data: {} as any, timestamp: now };
    const ackMsg: BaseMqttMessage<void> & { type: MqttMessageType.ACKNOWLEGDE } = { type: MqttMessageType.ACKNOWLEGDE, sn: 'sn', data: undefined, timestamp: now };
    service.messages$.next(alarmMsg);
    expect(deviceService.onAlarm).toHaveBeenCalledWith(alarmMsg);
    service.messages$.next(configMsg);
    expect(deviceService.onConfiguration).toHaveBeenCalledWith(configMsg.data);
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    service.messages$.next(ackMsg);
    expect(logSpy).toHaveBeenCalledWith("[MqttService]: received message of type 'acknowledgment':", ackMsg);
    logSpy.mockRestore();
  });

  it('should filter messages by type and device SN', (done) => {
    // Set the mock client for this test
    (service as any).client = mockMqttClient;
    
    const now = Date.now();
    const msg: BaseMqttMessage<AlarmPayload> & { type: MqttMessageType.ALARM } = { type: MqttMessageType.ALARM, sn: 'sn', data: {} as AlarmPayload, timestamp: now };
    service.onMessageOfType(MqttMessageType.ALARM, 'sn').subscribe(received => {
      expect(received).toEqual(msg);
      done();
    });
    service.messages$.next(msg);
  });

  it('should handle invalid JSON in handleIncomingMessage', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    const handle = (service as any).handleIncomingMessage.bind(service);
    handle(Buffer.from('not json'));
    expect(errorSpy).toHaveBeenCalledWith('[MqttService]: failed to parse MQTT message:', expect.any(Error));
    errorSpy.mockRestore();
  });

  it('should cleanup resources', () => {
    const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
    service.cleanup();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});