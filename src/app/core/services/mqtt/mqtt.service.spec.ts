import { TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { MqttService } from './mqtt.service';
import { AuthService } from '../auth/auth.service';
import { DeviceService } from '../device/device.service';
import { SigV4Service } from '../sig-v4/sig-v4.service';
import { MqttMessageType, MqttCommandType, AlarmPayload, DeviceConfiguration, BaseMqttMessage } from '../../models';
import { AuthSession } from 'aws-amplify/auth';
import { NgZone } from '@angular/core';
import { WINDOW } from '../../tokens/window';
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

// Mock window object for electron
const mockWindow = {
  electron: {
    ipcRenderer: {
      on: jest.fn()
    }
  },
  addEventListener: jest.fn()
};

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
      company: jest.fn(() => 'company'),
      isSessionTokenExpired: jest.fn(() => false)
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
        { provide: SigV4Service, useValue: sigV4Service },
        { provide: 'WINDOW', useValue: mockWindow }
      ]
    });
    
    service = TestBed.inject(MqttService);
    
    // Mock the effect-related methods to prevent automatic session handling
    jest.spyOn(service as any, 'initializeAuthSubscription').mockImplementation(() => {});
    jest.spyOn(service as any, 'handleSessionChange').mockImplementation(() => Promise.resolve());
    jest.spyOn(service as any, 'initializeSystemEventHandlers').mockImplementation(() => {});
    
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

  describe('Connection Management', () => {
    it('should return existing connection promise if already connecting', async () => {
      // Set a connection promise
      (service as any).connectionPromise = Promise.resolve();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.connect(mockSession);
      
      expect(logSpy).toHaveBeenCalledWith('[MqttService]: connection already in progress, waiting...');
      logSpy.mockRestore();
    });

    it('should skip reconnection if already connected to same session', async () => {
      // Set up as already connected to the same session
      (service as any).client = mockMqttClient;
      (service as any).lastIdentityId = mockSession.identityId;
      mockMqttClient.connected = true;
      
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.connect(mockSession);
      
      expect(logSpy).toHaveBeenCalledWith('[MqttService]: already connected to the same session');
      logSpy.mockRestore();
    });

    it('should return existing disconnection promise if already disconnecting', async () => {
      // Set a disconnection promise
      (service as any).disconnectionPromise = Promise.resolve();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.disconnect();
      
      expect(logSpy).toHaveBeenCalledWith('[MqttService]: disconnection already in progress, waiting...');
      logSpy.mockRestore();
    });

    it('should handle disconnect when no client exists and not connecting', async () => {
      (service as any).client = undefined;
      (service as any).isConnecting = false;
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.disconnect();
      
      expect(logSpy).toHaveBeenCalledWith('[MqttService]: no client to disconnect');
      logSpy.mockRestore();
    });

    it('should clear pending requests on disconnect', async () => {
      // Set up pending requests
      const mockRequest = {
        resolve: jest.fn(),
        reject: jest.fn(),
        timeout: setTimeout(() => {}, 1000)
      };
      (service as any).pendingRequests = { 'test-cid': mockRequest };
      
      (service as any).client = mockMqttClient;
      mockMqttClient.connected = true;
      mockMqttClient.end.mockImplementation((force: any, opts: any, cb: any) => cb());
      
      await service.disconnect();
      
      expect(mockRequest.reject).toHaveBeenCalledWith(new Error('[MqttService]: connection closed'));
      expect((service as any).pendingRequests).toEqual({});
    });
  });

  describe('Reconnection Management', () => {
    beforeEach(() => {
      // Clear any previous mock implementations to avoid interference
      mockMqttConnect.mockClear();
      jest.clearAllMocks();
    });

    it('should reset reconnection attempts on new connection', async () => {
      // Set reconnection attempts to non-zero
      (service as any).reconnectionAttempts = 3;
      
      authService.hasPolicy.mockReturnValue(true);
      (service as any).client = undefined;
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          setTimeout(() => {
            mockMqttClient.connected = true;
            callback();
          }, 0);
        }
      });
      
      await service.connect(mockSession);
      
      expect((service as any).reconnectionAttempts).toBe(0);
    });

    it('should handle maximum reconnection attempts in transformWsUrl', async () => {
      (service as any).client = undefined;
      
      // Mock the session data signal to return session data
      authService.sessionData.mockReturnValue(mockSession);
      authService.isSessionTokenExpired.mockReturnValue(false);
      
      // Mock transformWsUrl to be called - it should throw immediately due to max attempts
      (mockMqttConnect as any).mockImplementation((url: string, options: any) => {
        if (options?.transformWsUrl) {
          const transformWsUrl = options.transformWsUrl;
          // Set reconnection attempts to 4 before calling transformWsUrl
          (service as any).reconnectionAttempts = 4;
          expect(() => transformWsUrl('', {}, null as any)).toThrow('[MqttService]: maximum reconnection attempts reached; disconnecting...');
        }
        return mockMqttClient;
      });
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockMqttClient.connected = true;
          callback();
        }
      });
      
      await service.connect(mockSession);
      expect(mockMqttConnect).toHaveBeenCalled();
    });

    it('should handle session token expiration in transformWsUrl', async () => {
      (service as any).client = undefined;
      authService.isSessionTokenExpired.mockReturnValue(true);
      
      // Mock transformWsUrl to be called
      (mockMqttConnect as any).mockImplementation((url: string, options: any) => {
        if (options?.transformWsUrl) {
          const transformWsUrl = options.transformWsUrl;
          expect(() => transformWsUrl('', {}, null as any)).toThrow('[MqttService]: Session token expired, preventing reconnection');
        }
        return mockMqttClient;
      });
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockMqttClient.connected = true;
          callback();
        }
      });
      
      await service.connect(mockSession);
      expect(mockMqttConnect).toHaveBeenCalled();
    });

    it('should handle no session available in transformWsUrl', async () => {
      (service as any).client = undefined;
      authService.sessionData.mockReturnValue(null);
      
      // Mock transformWsUrl to be called
      (mockMqttConnect as any).mockImplementation((url: string, options: any) => {
        if (options?.transformWsUrl) {
          const transformWsUrl = options.transformWsUrl;
          expect(() => transformWsUrl('', {}, null as any)).toThrow('[MqttService]: No session available for reconnection');
        }
        return mockMqttClient;
      });
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockMqttClient.connected = true;
          callback();
        }
      });
      
      await service.connect(mockSession);
      expect(mockMqttConnect).toHaveBeenCalled();
    });

    it('should return new signed URL when session is available in transformWsUrl', async () => {
      (service as any).client = undefined;
      authService.sessionData.mockReturnValue(mockSession);
      authService.isSessionTokenExpired.mockReturnValue(false);
      sigV4Service.getSignedURL.mockReturnValue('wss://new-signed-url');
      
      // Mock transformWsUrl to be called
      let transformUrlResult = '';
      (mockMqttConnect as any).mockImplementation((url: string, options: any) => {
        if (options?.transformWsUrl) {
          const transformWsUrl = options.transformWsUrl;
          transformUrlResult = transformWsUrl('', {}, null as any);
        }
        return mockMqttClient;
      });
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockMqttClient.connected = true;
          callback();
        }
      });
      
      await service.connect(mockSession);
      expect(transformUrlResult).toBe('wss://new-signed-url');
      expect(sigV4Service.getSignedURL).toHaveBeenCalledWith(mockSession);
    });
  });

  describe('System Event Handlers', () => {
    beforeEach(() => {
      // Reset mocks and enable system event handlers for these tests
      jest.clearAllMocks();
      mockWindow.addEventListener.mockClear();
      
      // Create a new service instance without mocking initializeSystemEventHandlers
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          MqttService,
          { provide: AuthService, useValue: authService },
          { provide: DeviceService, useValue: deviceService },
          { provide: 'NotificationService', useValue: notificationService },
          { provide: SigV4Service, useValue: sigV4Service },
          { provide: WINDOW, useValue: mockWindow }
        ]
      });
      
      // Don't mock the system event handlers for these tests
      service = TestBed.inject(MqttService);
      jest.spyOn(service as any, 'initializeAuthSubscription').mockImplementation(() => {});
      jest.spyOn(service as any, 'handleSessionChange').mockImplementation(() => Promise.resolve());
    });

    it('should set up offline event listener', () => {
      // The system event handlers are set up in the constructor
      // We should see the listener was added
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should cleanup on offline event', () => {
      const cleanupSpy = jest.spyOn(service, 'cleanup').mockImplementation();
      
      // Find the offline event handler and call it
      const offlineHandler = mockWindow.addEventListener.mock.calls
        .find(call => call[0] === 'offline')?.[1];
      
      expect(offlineHandler).toBeDefined();
      if (offlineHandler) {
        offlineHandler();
      }
      
      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should set up system suspended event listener when electron is available', () => {
      // The system event handlers for electron should be set up
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith('system-suspended', expect.any(Function));
    });

    it('should cleanup on system suspended event', () => {
      const cleanupSpy = jest.spyOn(service, 'cleanup').mockImplementation();
      
      // Find the system suspended event handler and call it
      const suspendedHandler = mockWindow.electron.ipcRenderer.on.mock.calls
        .find(call => call[0] === 'system-suspended')?.[1];
      
      expect(suspendedHandler).toBeDefined();
      if (suspendedHandler) {
        suspendedHandler();
      }
      
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Session Change Handling', () => {
    beforeEach(() => {
      // Remove the mock for handleSessionChange to test it
      jest.restoreAllMocks();
      jest.spyOn(service as any, 'initializeAuthSubscription').mockImplementation(() => {});
      jest.spyOn(service as any, 'initializeSystemEventHandlers').mockImplementation(() => {});
    });

    it('should disconnect when no session data', async () => {
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await (service as any).handleSessionChange(null);
      
      expect(logSpy).toHaveBeenCalledWith('[MqttService]: no session data, disconnecting MQTT');
      expect(disconnectSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should not reconnect for same user session refresh', async () => {
      (service as any).client = mockMqttClient;
      (service as any).lastIdentityId = mockSession.identityId;
      mockMqttClient.connected = true;
      
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await (service as any).handleSessionChange(mockSession);
      
      expect(logSpy).toHaveBeenCalledWith('[MqttService]: session refreshed for same user, updating credentials without reconnecting');
      expect(connectSpy).not.toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should reconnect for different user', async () => {
      (service as any).client = mockMqttClient;
      (service as any).lastIdentityId = 'different-id';
      mockMqttClient.connected = true;
      
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await (service as any).handleSessionChange(mockSession);
      
      expect(logSpy).toHaveBeenCalledWith('[MqttService]: different user detected, reconnecting MQTT');
      expect(disconnectSpy).toHaveBeenCalled();
      expect(connectSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should connect when not connected', async () => {
      (service as any).client = undefined;
      mockMqttClient.connected = false;
      
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
      const logSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await (service as any).handleSessionChange(mockSession);
      
      expect(logSpy).toHaveBeenCalledWith('[MqttService]: establishing MQTT connection');
      expect(connectSpy).toHaveBeenCalledWith(mockSession);
      logSpy.mockRestore();
    });

    it('should handle errors in session change', async () => {
      const connectSpy = jest.spyOn(service, 'connect').mockRejectedValue(new Error('Connection failed'));
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await (service as any).handleSessionChange(mockSession);
      
      expect(errorSpy).toHaveBeenCalledWith('[MqttService]: error handling session change:', expect.any(Error));
      errorSpy.mockRestore();
    });
  });

  describe('Client Event Handlers', () => {
    beforeEach(() => {
      // Clear any previous mock implementations to avoid interference
      mockMqttConnect.mockClear();
      jest.clearAllMocks();
    });

    it('should set up all client event handlers', async () => {
      (service as any).client = undefined;
      
      // Mock the session data signal to return session data
      authService.sessionData.mockReturnValue(mockSession);
      authService.isSessionTokenExpired.mockReturnValue(false);
      sigV4Service.getSignedURL.mockReturnValue('wss://test-url');
      
      // Set up a clean mock implementation
      (mockMqttConnect as any).mockImplementation((url: string, options: any) => {
        return mockMqttClient;
      });
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockMqttClient.connected = true;
          callback();
        }
      });
      
      await service.connect(mockSession);
      
      expect(mockMqttClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should subscribe to company topic on connect event', async () => {
      (service as any).client = undefined;
      
      // Mock the session data signal to return session data
      authService.sessionData.mockReturnValue(mockSession);
      authService.isSessionTokenExpired.mockReturnValue(false);
      sigV4Service.getSignedURL.mockReturnValue('wss://test-url');
      
      // Set up a clean mock implementation
      (mockMqttConnect as any).mockImplementation((url: string, options: any) => {
        return mockMqttClient;
      });
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockMqttClient.connected = true;
          callback();
        }
      });
      
      let connectHandler: Function;
      mockMqttClient.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          connectHandler = handler;
        }
      });
      
      await service.connect(mockSession);
      
      // Simulate connect event
      connectHandler!();
      
      expect(mockMqttClient.subscribe).toHaveBeenCalledWith('companies/company/events', expect.any(Function));
    });

    it('should handle subscription errors', async () => {
      (service as any).client = undefined;
      
      // Mock the session data signal to return session data
      authService.sessionData.mockReturnValue(mockSession);
      authService.isSessionTokenExpired.mockReturnValue(false);
      sigV4Service.getSignedURL.mockReturnValue('wss://test-url');
      
      // Set up a clean mock implementation
      (mockMqttConnect as any).mockImplementation((url: string, options: any) => {
        return mockMqttClient;
      });
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        if (event === 'connect') {
          mockMqttClient.connected = true;
          callback();
        }
      });
      
      let connectHandler: Function;
      mockMqttClient.on.mockImplementation((event, handler) => {
        if (event === 'connect') {
          connectHandler = handler;
        }
      });
      
      mockMqttClient.subscribe.mockImplementation((topic, callback) => {
        callback(new Error('Subscription failed'));
      });
      
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      await service.connect(mockSession);
      
      // Simulate connect event
      connectHandler!();
      
      expect(errorSpy).toHaveBeenCalledWith('[MqttService]: failed to subscribe to topic:', 'companies/company/events', expect.any(Error));
      errorSpy.mockRestore();
    });

    it('should remove all event listeners on disconnect', async () => {
      (service as any).client = mockMqttClient;
      mockMqttClient.connected = true;
      mockMqttClient.end.mockImplementation((force: any, opts: any, cb: any) => cb());
      
      await service.disconnect();
      
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('connect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('message');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('error');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('disconnect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('close');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('reconnect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('offline');
    });
  });

  describe('Error Handling', () => {
    it('should handle connection timeout in establishConnection', async () => {
      (service as any).client = undefined;
      
      mockMqttClient.once.mockImplementation((event, callback) => {
        // Don't call any callback to simulate timeout
      });
      
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // The service should timeout and throw an error
      // Since we're not calling any callbacks, the connection promise will hang
      // We need to either simulate a timeout or just verify the error path
      await expect(async () => {
        const connectPromise = service.connect(mockSession);
        
        // Simulate timeout by rejecting after a short delay
        setTimeout(() => {
          const timeoutError = new Error('Connection timeout');
          // Find the error callback from the once mock calls and call it
          const onceCalls = mockMqttClient.once.mock.calls;
          const errorCall = onceCalls.find(call => call[0] === 'error');
          if (errorCall) {
            errorCall[1](timeoutError);
          }
        }, 100);
        
        await connectPromise;
      }).rejects.toThrow();
      
      errorSpy.mockRestore();
    }, 1000);

    it('should handle missing company or device serial number in sendCommand', async () => {
      (service as any).client = mockMqttClient;
      mockMqttClient.connected = true;
      
      // Mock missing company
      authService.company.mockReturnValue(null);
      
      await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION))
        .rejects.toThrow('[MqttService]: missing company or device serial number');
    });

    it('should handle missing device serial number in sendCommand', async () => {
      (service as any).client = mockMqttClient;
      mockMqttClient.connected = true;
      
      // Mock missing device serial number
      deviceService.serialNumber.mockReturnValue(null);
      
      await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION))
        .rejects.toThrow('[MqttService]: missing company or device serial number');
    });
  });
});