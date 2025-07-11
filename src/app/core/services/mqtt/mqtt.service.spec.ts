import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, of } from 'rxjs';
import { MqttService } from './mqtt.service';
import { AuthService } from '../auth/auth.service';
import { SigV4Service } from '../sig-v4/sig-v4.service';
import { DeviceService } from '../device/device.service';
import { 
  MqttMessageType, 
  MqttCommandType, 
  ConnectionStatus, 
  AlarmPayload, 
  DeviceConfiguration,
  BaseMqttMessage
} from '../../models';
import { AuthSession, GetCurrentUserOutput, FetchUserAttributesOutput } from 'aws-amplify/auth';

// Mock mqtt module
const mockMqttClient = {
  connected: false,
  connect: jest.fn(),
  subscribe: jest.fn(),
  publish: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
  removeAllListeners: jest.fn()
};

jest.mock('mqtt', () => ({
  connect: jest.fn(() => mockMqttClient)
}));

// Mock APP_CONFIG
jest.mock('../../../../environments/environment', () => ({
  APP_CONFIG: {
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
  let authService: AuthService;
  let sigV4Service: jest.Mocked<SigV4Service>;
  let deviceService: jest.Mocked<DeviceService>;

  const mockAuthSession: AuthSession = {
    identityId: 'test-identity-id',
    credentials: {
      accessKeyId: 'test-access-key',
      secretAccessKey: 'test-secret-key',
      sessionToken: 'test-session-token',
      expiration: new Date(Date.now() + 3600000) // 1 hour from now
    },
    tokens: {
      accessToken: {
        payload: {},
        toString: () => 'test-access-token'
      },
      idToken: {
        payload: {
          'custom:hasPolicy': '1',
          'custom:Company': 'test-company'
        },
        toString: () => 'test-id-token'
      }
    },
    userSub: 'test-user-sub'
  } as any;

  const mockUser: GetCurrentUserOutput = {
    username: 'test-user',
    userId: 'test-user-id'
  } as any;

  const mockUserAttributes: FetchUserAttributesOutput = {
    email: 'test@example.com',
    'custom:Company': 'test-company'
  };

  // Create mock AuthService class
  class MockAuthService {
    readonly sessionData = new BehaviorSubject<Nullable<AuthSession>>(null);
    private readonly user = new BehaviorSubject<Nullable<GetCurrentUserOutput>>(null);
    private readonly userAttributes = new BehaviorSubject<Nullable<FetchUserAttributesOutput>>(null);

    public readonly sessionData$ = this.sessionData.asObservable();
    public readonly user$ = this.user.asObservable();
    public readonly userAttributes$ = this.userAttributes.asObservable();

    constructor() {
      // Mock constructor behavior
    }

    fetchSession = jest.fn();
    getUser = jest.fn();
    getUserAttributes = jest.fn();
  }

  beforeEach(() => {
    const sigV4ServiceSpy = {
      getSignedURL: jest.fn().mockReturnValue('wss://test-url')
    };

    const deviceServiceSpy = {
      onAlarm: jest.fn(),
      onConfiguration: jest.fn(),
      getSerialNumber: jest.fn().mockReturnValue('test-device-sn'),
      generateCid: jest.fn().mockReturnValue('test-cid-123')
    };

    TestBed.configureTestingModule({
      providers: [
        MqttService,
        { provide: AuthService, useClass: MockAuthService },
        { provide: SigV4Service, useValue: sigV4ServiceSpy },
        { provide: DeviceService, useValue: deviceServiceSpy }
      ]
    });

    service = TestBed.inject(MqttService);
    authService = TestBed.inject(AuthService);
    sigV4Service = TestBed.inject(SigV4Service) as jest.Mocked<SigV4Service>;
    deviceService = TestBed.inject(DeviceService) as jest.Mocked<DeviceService>;

    // Reset mocks
    jest.clearAllMocks();
    mockMqttClient.connected = false;
    mockMqttClient.on.mockClear();
    mockMqttClient.subscribe.mockClear();
    mockMqttClient.publish.mockClear();
    mockMqttClient.end.mockClear();
  });

  afterEach(() => {
    service.cleanup();
    jest.clearAllTimers();
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with correct default values', () => {
      expect(service.isConnected).toBe(false);
      expect(service.messages$.value).toBeNull();
      expect(service.devicesConnectionStatus$.value).toEqual(new Map());
    });

    it('should subscribe to auth service session data on initialization', () => {
      expect(authService.sessionData$).toBeDefined();
    });
  });

  describe('Authentication Handling', () => {
    it('should handle session change with valid session data', async () => {
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
      
      authService.sessionData.next(mockAuthSession);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(connectSpy).toHaveBeenCalledWith(mockAuthSession);
    });

    it('should disconnect when session data is null', async () => {
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      
      authService.sessionData.next(null);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should reconnect when different user session is detected', async () => {
      // Set up spies before any connections
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      const reconnectSpy = jest.spyOn(service as any, 'reconnect').mockResolvedValue(undefined);
      
      // First connect with original session
      authService.sessionData.next(mockAuthSession);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Manually set the current session and connection state to simulate an established connection
      (service as any).currentSession = mockAuthSession;
      mockMqttClient.connected = true;
      Object.defineProperty(service, 'isConnected', {
        get: jest.fn(() => true),
        configurable: true
      });
      
      // Clear previous spy calls
      connectSpy.mockClear();
      disconnectSpy.mockClear();
      reconnectSpy.mockClear();
      
      // Create different user session
      const differentSession: AuthSession = {
        identityId: 'different-identity-id',
        credentials: {
          accessKeyId: 'test-access-key',
          secretAccessKey: 'test-secret-key',
          sessionToken: 'test-session-token',
          expiration: new Date(Date.now() + 3600000)
        },
        tokens: {
          accessToken: {
            payload: {},
            toString: () => 'test-access-token'
          },
          idToken: {
            payload: {
              'custom:hasPolicy': '1',
              'custom:Company': 'test-company'
            },
            toString: () => 'test-id-token'
          }
        },
        userSub: 'different-user-sub'
      } as any;
      
      // Trigger the session change
      authService.sessionData.next(differentSession);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Check that reconnect was called (which internally calls disconnect then connect)
      expect(reconnectSpy).toHaveBeenCalledWith(differentSession);
    });

    it('should update credentials for same user without reconnecting', async () => {
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      
      // First connect
      authService.sessionData.next(mockAuthSession);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Mock connection state and set current session
      mockMqttClient.connected = true;
      jest.spyOn(service, 'isConnected', 'get').mockReturnValue(true);
      (service as any).currentSession = mockAuthSession;
      
      // Same user with refreshed token
      const refreshedSession = {
        ...mockAuthSession,
        tokens: {
          ...mockAuthSession.tokens,
          accessToken: {
            payload: {},
            toString: () => 'new-access-token'
          }
        }
      };
      
      connectSpy.mockClear();
      disconnectSpy.mockClear();
      
      authService.sessionData.next(refreshedSession);
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(disconnectSpy).not.toHaveBeenCalled();
      expect(connectSpy).not.toHaveBeenCalled();
    });
  });

  describe('MQTT Connection', () => {
    it('should connect to MQTT broker successfully', async () => {
      const mockConnect = require('mqtt').connect;
      
      await service.connect(mockAuthSession);
      
      expect(mockConnect).toHaveBeenCalledWith('wss://test-url', expect.objectContaining({
        clientId: 'test-identity-id',
        protocolId: 'MQTT',
        protocolVersion: 4,
        port: 443,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30000,
        keepalive: 60,
        transformWsUrl: expect.any(Function)
      }));
    });

    it('should skip connection if user does not have IoT policy', async () => {
      const sessionWithoutPolicy = {
        ...mockAuthSession,
        tokens: {
          ...mockAuthSession.tokens,
          idToken: {
            payload: {
              'custom:hasPolicy': '0',
              'custom:Company': 'test-company'
            },
            toString: () => 'test-id-token'
          }
        }
      } as any;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.connect(sessionWithoutPolicy);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'User does not have an iot policy attached yet; skipping...'
      );
      
      consoleSpy.mockRestore();
    });

    it('should not connect if already connecting', async () => {
      (service as any).isConnecting = true;
      const mockConnect = require('mqtt').connect;
      mockConnect.mockClear();
      
      await service.connect(mockAuthSession);
      
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should handle connection errors', async () => {
      const mockConnect = require('mqtt').connect;
      mockConnect.mockImplementationOnce(() => {
        throw new Error('Connection failed');
      });
      
      await expect(service.connect(mockAuthSession)).rejects.toThrow('Connection failed');
      expect((service as any).isConnecting).toBe(false);
    });

    it('should setup transformWsUrl function correctly', async () => {
      await service.connect(mockAuthSession);
      
      const connectOptions = require('mqtt').connect.mock.calls[0][1];
      const transformWsUrl = connectOptions.transformWsUrl;
      
      // Mock current session in auth service
      authService.sessionData.next(mockAuthSession);
      
      const transformedUrl = transformWsUrl('original-url', {}, {});
      expect(transformedUrl).toBe('wss://test-url');
      expect(sigV4Service.getSignedURL).toHaveBeenCalledWith(mockAuthSession);
    });
  });

  describe('MQTT Client Event Handlers', () => {
    beforeEach(async () => {
      await service.connect(mockAuthSession);
    });

    it('should handle connect event and subscribe to company topic', () => {
      const connectCallback = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      expect(connectCallback).toBeDefined();
      
      mockMqttClient.subscribe.mockImplementation((topic, callback) => {
        callback(null);
      });
      
      connectCallback();
      
      expect(mockMqttClient.subscribe).toHaveBeenCalledWith(
        'companies/test-company/events',
        expect.any(Function)
      );
      expect((service as any).isConnecting).toBe(false);
    });

    it('should handle subscribe error in connect event', () => {
      const connectCallback = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const subscribeError = new Error('Subscribe failed');
      
      mockMqttClient.subscribe.mockImplementation((topic, callback) => {
        callback(subscribeError);
      });
      
      connectCallback();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to subscribe to topic:',
        'companies/test-company/events',
        subscribeError
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle message event', () => {
      const messageCallback = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      expect(messageCallback).toBeDefined();
      
      const testMessage = {
        type: MqttMessageType.CONNECTION_STATUS,
        sn: 'test-device',
        data: { connected: true }
      };
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      messageCallback('test-topic', Buffer.from(JSON.stringify(testMessage)));
      
      expect(service.messages$.value).toEqual(testMessage);
      expect(consoleSpy).toHaveBeenCalledWith(
        'MQTT message received on topic test-topic:',
        JSON.stringify(testMessage)
      );
      
      consoleSpy.mockRestore();
    });

    it('should handle various client events', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Test error event
      const errorCallback = mockMqttClient.on.mock.calls.find(call => call[0] === 'error')?.[1];
      errorCallback(new Error('Test error'));
      expect(consoleErrorSpy).toHaveBeenCalledWith('MQTT client error:', expect.any(Error));
      expect((service as any).isConnecting).toBe(false);
      
      // Test disconnect event
      const disconnectCallback = mockMqttClient.on.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      disconnectCallback({ reasonCode: 0 });
      expect(consoleSpy).toHaveBeenCalledWith('MQTT client disconnected:', { reasonCode: 0 });
      
      // Test close event
      const closeCallback = mockMqttClient.on.mock.calls.find(call => call[0] === 'close')?.[1];
      closeCallback();
      expect(consoleSpy).toHaveBeenCalledWith('MQTT connection closed');
      expect((service as any).isConnecting).toBe(false);
      
      // Test reconnect event
      const reconnectCallback = mockMqttClient.on.mock.calls.find(call => call[0] === 'reconnect')?.[1];
      reconnectCallback();
      expect(consoleSpy).toHaveBeenCalledWith('MQTT client attempting to reconnect...');
      
      // Test offline event
      const offlineCallback = mockMqttClient.on.mock.calls.find(call => call[0] === 'offline')?.[1];
      offlineCallback();
      expect(consoleSpy).toHaveBeenCalledWith('MQTT client is offline');
      
      consoleSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Message Handling', () => {
    it('should handle connection status messages', (done) => {
      const connectionMessage = {
        type: MqttMessageType.CONNECTION_STATUS,
        sn: 'device-123',
        data: { connected: true },
        timestamp: new Date().toISOString()
      } as any;

      // Subscribe to the devices connection status to verify the update
      service.devicesConnectionStatus$.subscribe(devicesStatus => {
        if (devicesStatus.size > 0) {
          expect(devicesStatus.get('device-123')).toBe(true);
          done();
        }
      });

      service.messages$.next(connectionMessage);
    });

    it('should handle alarm messages', () => {
      const alarmMessage = {
        type: MqttMessageType.ALARM,
        sn: 'device-123',
        data: { /* alarm data */ } as AlarmPayload,
        timestamp: new Date().toISOString()
      } as any;

      service.messages$.next(alarmMessage);

      expect(deviceService.onAlarm).toHaveBeenCalledWith(alarmMessage);
    });

    it('should handle configuration messages', () => {
      const configMessage = {
        type: MqttMessageType.CONFIGURATION,
        sn: 'device-123',
        data: { /* config data */ } as DeviceConfiguration,
        timestamp: new Date().toISOString()
      } as any;

      service.messages$.next(configMessage);

      expect(deviceService.onConfiguration).toHaveBeenCalledWith(configMessage.data);
    });

    it('should handle ACK messages', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const ackMessage = {
        type: MqttMessageType.ACK,
        sn: 'device-123',
        data: { /* config data */ } as DeviceConfiguration,
        timestamp: new Date().toISOString()
      } as any;

      service.messages$.next(ackMessage);

      expect(consoleSpy).toHaveBeenCalledWith('Acknowledgment:', ackMessage);
      
      consoleSpy.mockRestore();
    });

    it('should filter messages by type', (done) => {
      const connectionMessage = {
        type: MqttMessageType.CONNECTION_STATUS,
        sn: 'device-123',
        data: { connected: true },
        timestamp: new Date().toISOString()
      } as any;

      service.onMessageOfType(MqttMessageType.CONNECTION_STATUS).subscribe(message => {
        expect(message).toEqual(connectionMessage);
        done();
      });

      service.messages$.next(connectionMessage);
    });

    it('should filter messages by device serial number', (done) => {
      const message = {
        type: MqttMessageType.CONNECTION_STATUS,
        sn: 'specific-device',
        data: { connected: true },
        timestamp: new Date().toISOString()
      } as any;

      service.onMessageOfType(MqttMessageType.CONNECTION_STATUS, 'specific-device')
        .subscribe(receivedMessage => {
          expect(receivedMessage).toEqual(message);
          done();
        });

      // Send message for different device - should not trigger
      service.messages$.next({
        type: MqttMessageType.CONNECTION_STATUS,
        sn: 'other-device',
        data: { connected: false },
        timestamp: new Date().toISOString()
      } as any);

      // Send message for target device - should trigger
      service.messages$.next(message);
    });

    it('should handle messages with correlation IDs', () => {
      const pendingRequests = (service as any).pendingRequests;
      const testCid = 'test-correlation-id';
      
      // Set up a pending request
      const mockResolve = jest.fn();
      const mockTimeout = setTimeout(() => {}, 1000);
      
      pendingRequests[testCid] = {
        resolve: mockResolve,
        reject: jest.fn(),
        timeout: mockTimeout
      };

      const responseMessage = {
        type: MqttMessageType.ACK,
        cid: testCid,
        sn: 'device-123',
        data: { success: true }
      };

      // Simulate receiving the message
      const handleIncomingMessage = (service as any).handleIncomingMessage.bind(service);
      handleIncomingMessage(Buffer.from(JSON.stringify(responseMessage)));

      expect(mockResolve).toHaveBeenCalledWith(responseMessage);
      expect(pendingRequests[testCid]).toBeUndefined();
    });

    it('should handle invalid JSON messages gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Simulate invalid JSON message
      const invalidMessage = Buffer.from('invalid json');
      const handleIncomingMessage = (service as any).handleIncomingMessage.bind(service);
      
      handleIncomingMessage(invalidMessage);
      
      expect(consoleSpy).toHaveBeenCalledWith('Failed to parse MQTT message:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });
  });

  describe('Command Sending', () => {
    beforeEach(async () => {
      await service.connect(mockAuthSession);
      mockMqttClient.connected = true;
      (service as any).currentSession = mockAuthSession;
    });

    it('should send command successfully', async () => {
      const testPayload = { test: 'data' };
      
      mockMqttClient.publish.mockImplementation((topic, message, callback) => {
        setTimeout(() => callback(null), 0);
      });

      const commandPromise = service.sendCommand(MqttCommandType.SET_CONFIGURATION, testPayload);
      
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'companies/test-company/devices/test-device-sn/commands',
        JSON.stringify({
          type: MqttCommandType.SET_CONFIGURATION,
          cid: 'test-cid-123',
          test: 'data'
        }),
        expect.any(Function)
      );

      // Simulate response
      setTimeout(() => {
        const responseMessage = {
          type: MqttMessageType.ACK,
          cid: 'test-cid-123',
          sn: 'test-device-sn',
          data: { success: true }
        };
        
        const handleIncomingMessage = (service as any).handleIncomingMessage.bind(service);
        handleIncomingMessage(Buffer.from(JSON.stringify(responseMessage)));
      }, 10);

      const result = await commandPromise;
      expect(result).toEqual({
        type: MqttMessageType.ACK,
        cid: 'test-cid-123',
        sn: 'test-device-sn',
        data: { success: true }
      });
    });

    it('should reject command when not connected', async () => {
      mockMqttClient.connected = false;
      
      await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION))
        .rejects.toThrow('MQTT client is not connected');
    });

    it('should handle publish errors', async () => {
      const testError = new Error('Publish failed');
      mockMqttClient.publish.mockImplementation((topic, message, callback) => {
        callback(testError);
      });

      await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION))
        .rejects.toThrow('Publish failed');
    });

    it('should handle command timeout', async () => {
      jest.useFakeTimers();
      
      mockMqttClient.publish.mockImplementation((topic, message, callback) => {
        callback(null);
      });

      const commandPromise = service.sendCommand(MqttCommandType.SET_CONFIGURATION);
      
      // Fast forward time to trigger timeout
      jest.advanceTimersByTime(6000);
      
      await expect(commandPromise).rejects.toThrow('MQTT request timeout');
      
      jest.useRealTimers();
    });

    it('should reject command when company is missing', async () => {
      (service as any).currentSession = {
        ...mockAuthSession,
        tokens: {
          idToken: {
            payload: {}
          }
        }
      };
      
      await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION))
        .rejects.toThrow('Missing company or device serial number');
    });

    it('should reject command when device SN is missing', async () => {
      deviceService.getSerialNumber.mockReturnValue('');
      
      await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION))
        .rejects.toThrow('Missing company or device serial number');
    });

    it('should send command without payload', async () => {
      mockMqttClient.publish.mockImplementation((topic, message, callback) => {
        callback(null);
      });

      const commandPromise = service.sendCommand(MqttCommandType.SET_CONFIGURATION);
      
      expect(mockMqttClient.publish).toHaveBeenCalledWith(
        'companies/test-company/devices/test-device-sn/commands',
        JSON.stringify({
          type: MqttCommandType.SET_CONFIGURATION,
          cid: 'test-cid-123'
        }),
        expect.any(Function)
      );

      // Simulate timeout to avoid hanging test
      setTimeout(() => {
        const timeoutError = new Error('MQTT request timeout');
        const pendingRequest = (service as any).pendingRequests['test-cid-123'];
        if (pendingRequest) {
          pendingRequest.reject(timeoutError);
          delete (service as any).pendingRequests['test-cid-123'];
        }
      }, 10);

      await expect(commandPromise).rejects.toThrow('MQTT request timeout');
    });
  });

  describe('Disconnection', () => {
    beforeEach(async () => {
      await service.connect(mockAuthSession);
      mockMqttClient.connected = true;
    });

    it('should disconnect gracefully', async () => {
      mockMqttClient.end.mockImplementation((force, options, callback) => {
        setTimeout(() => callback(), 0);
      });

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.disconnect();

      expect(mockMqttClient.removeAllListeners).toHaveBeenCalled();
      expect(mockMqttClient.end).toHaveBeenCalledWith(true, {}, expect.any(Function));
      expect(consoleSpy).toHaveBeenCalledWith('MQTT client disconnected gracefully');
      
      consoleSpy.mockRestore();
    });

    it('should handle disconnect when not connected', async () => {
      mockMqttClient.connected = false;
      (service as any).client = undefined;
      
      await service.disconnect();
      
      expect(mockMqttClient.end).not.toHaveBeenCalled();
    });

    it('should handle disconnect when already disconnecting', async () => {
      (service as any).isDisconnecting = true;
      
      await service.disconnect();
      
      expect(mockMqttClient.removeAllListeners).not.toHaveBeenCalled();
    });

    it('should clear pending requests on disconnect', async () => {
      // Set up pending request
      const pendingRequests = (service as any).pendingRequests;
      const mockReject = jest.fn();
      const mockTimeout = setTimeout(() => {}, 1000);
      
      pendingRequests['test-cid'] = {
        resolve: jest.fn(),
        reject: mockReject,
        timeout: mockTimeout
      };

      mockMqttClient.end.mockImplementation((force, options, callback) => {
        setTimeout(() => callback(), 0);
      });
      
      await service.disconnect();
      
      expect(mockReject).toHaveBeenCalledWith(new Error('Connection closed'));
      expect(pendingRequests['test-cid']).toBeUndefined();
    });

    it('should handle disconnect errors', async () => {
      const testError = new Error('Disconnect failed');
      mockMqttClient.end.mockImplementation(() => {
        throw testError;
      });

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.disconnect();

      expect(consoleSpy).toHaveBeenCalledWith('Error during MQTT disconnect:', testError);
      expect((service as any).isDisconnecting).toBe(false);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Reconnection', () => {
    it('should reconnect properly', async () => {
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await (service as any).reconnect(mockAuthSession);

      expect(consoleSpy).toHaveBeenCalledWith('Reconnecting MQTT client...');
      expect(disconnectSpy).toHaveBeenCalled();
      expect(connectSpy).toHaveBeenCalledWith(mockAuthSession);
      
      consoleSpy.mockRestore();
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      
      service.cleanup();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });

    it('should unsubscribe from auth service', () => {
      const authSubscription = (service as any).authSubscription;
      const unsubscribeSpy = jest.spyOn(authSubscription, 'unsubscribe');
      
      service.cleanup();
      
      expect(unsubscribeSpy).toHaveBeenCalled();
    });
  });

  describe('Connection Status', () => {
    it('should return correct connection status when connected', () => {
      mockMqttClient.connected = true;
      (service as any).client = mockMqttClient;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      expect(service.isConnected).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('MQTT connection status: true');
      
      consoleSpy.mockRestore();
    });

    it('should return correct connection status when disconnected', () => {
      mockMqttClient.connected = false;
      (service as any).client = mockMqttClient;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      expect(service.isConnected).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('MQTT connection status: false');
      
      consoleSpy.mockRestore();
    });

    it('should return false when client is undefined', () => {
      (service as any).client = undefined;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      expect(service.isConnected).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('MQTT connection status: false');
      
      consoleSpy.mockRestore();
    });
  });

  describe('Event Handlers Removal', () => {
    it('should remove all event handlers', () => {
      (service as any).client = mockMqttClient;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      (service as any).removeClientEventHandlers();
      
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('connect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('message');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('error');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('disconnect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('close');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('reconnect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('offline');
      expect(consoleSpy).toHaveBeenCalledWith('MQTT client event handlers removed');
      
      consoleSpy.mockRestore();
    });

    it('should handle removal when client is undefined', () => {
      (service as any).client = undefined;
      
      // Should not throw error
      expect(() => (service as any).removeClientEventHandlers()).not.toThrow();
    });
  });

  describe('Pending Requests Management', () => {
    it('should clear all pending requests', () => {
      const pendingRequests = (service as any).pendingRequests;
      const mockReject1 = jest.fn();
      const mockReject2 = jest.fn();
      const mockTimeout1 = setTimeout(() => {}, 1000);
      const mockTimeout2 = setTimeout(() => {}, 1000);
      
      pendingRequests['cid1'] = {
        resolve: jest.fn(),
        reject: mockReject1,
        timeout: mockTimeout1
      };
      
      pendingRequests['cid2'] = {
        resolve: jest.fn(),
        reject: mockReject2,
        timeout: mockTimeout2
      };

      (service as any).clearPendingRequests();

      expect(mockReject1).toHaveBeenCalledWith(new Error('Connection closed'));
      expect(mockReject2).toHaveBeenCalledWith(new Error('Connection closed'));
      expect(Object.keys(pendingRequests)).toHaveLength(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined session data in transformWsUrl', async () => {
      await service.connect(mockAuthSession);
      
      const connectOptions = require('mqtt').connect.mock.calls[0][1];
      const transformWsUrl = connectOptions.transformWsUrl;
      
      // Mock no current session
      authService.sessionData.next(null);
      
      const result = transformWsUrl('original-url', {}, {});
      expect(result).toBe('original-url');
    });

    it('should handle missing tokens in session', async () => {
      const sessionWithoutTokens = {
        ...mockAuthSession,
        tokens: undefined
      } as any;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await service.connect(sessionWithoutTokens);
      
      // Should still attempt connection but may log warnings
      expect(require('mqtt').connect).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle missing company in token payload', async () => {
      const sessionWithoutCompany = {
        ...mockAuthSession,
        tokens: {
          idToken: {
            payload: {}
            // Missing 'custom:Company'
          }
        }
      } as any;

      await service.connect(sessionWithoutCompany);
      
      // Should connect but subscription might fail
      expect(require('mqtt').connect).toHaveBeenCalled();
    });

    it('should handle messages without correlation ID', () => {
      const messageWithoutCid = {
        type: MqttMessageType.CONNECTION_STATUS,
        sn: 'device-123',
        data: { connected: true },
        timestamp: new Date().toISOString()
      } as any;

      const handleIncomingMessage = (service as any).handleIncomingMessage.bind(service);
      
      // Should not throw error
      expect(() => {
        handleIncomingMessage(Buffer.from(JSON.stringify(messageWithoutCid)));
      }).not.toThrow();
      
      expect(service.messages$.value).toEqual(messageWithoutCid);
    });

    it('should handle correlation ID for non-existent pending request', () => {
      const messageWithUnknownCid = {
        type: MqttMessageType.ACK,
        cid: 'unknown-correlation-id',
        sn: 'device-123',
        data: { success: true }
      };

      const handleIncomingMessage = (service as any).handleIncomingMessage.bind(service);
      
      // Should not throw error
      expect(() => {
        handleIncomingMessage(Buffer.from(JSON.stringify(messageWithUnknownCid)));
      }).not.toThrow();
      
      expect(service.messages$.value).toEqual(messageWithUnknownCid);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete authentication flow', async () => {
      const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();

      // Initial state - no session
      expect(authService.sessionData.value).toBeNull();

      // User signs in
      authService.sessionData.next(mockAuthSession);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(connectSpy).toHaveBeenCalledWith(mockAuthSession);

      // User signs out
      connectSpy.mockClear();
      authService.sessionData.next(null);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(disconnectSpy).toHaveBeenCalled();

      // User signs in again
      disconnectSpy.mockClear();
      authService.sessionData.next(mockAuthSession);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(connectSpy).toHaveBeenCalledWith(mockAuthSession);
    });

    it('should handle message flow end-to-end', async () => {
      await service.connect(mockAuthSession);
      mockMqttClient.connected = true;
      (service as any).currentSession = mockAuthSession;

      // Setup command
      mockMqttClient.publish.mockImplementation((topic, message, callback) => {
        callback(null);
        
        // Simulate device response
        setTimeout(() => {
          const responseMessage = {
            type: MqttMessageType.ACK,
            cid: 'test-cid-123',
            sn: 'test-device-sn',
            data: { success: true }
          };
          
          const handleIncomingMessage = (service as any).handleIncomingMessage.bind(service);
          handleIncomingMessage(Buffer.from(JSON.stringify(responseMessage)));
        }, 10);
      });

      const result = await service.sendCommand(MqttCommandType.SET_CONFIGURATION, { test: 'data' });
      
      expect(result.data.success).toBe(true);
      expect(result.cid).toBe('test-cid-123');
    });
  });
});