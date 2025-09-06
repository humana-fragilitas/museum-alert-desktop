import { BehaviorSubject,
         firstValueFrom,
         take } from 'rxjs';
import mqtt from 'mqtt';

import { TestBed } from '@angular/core/testing';

import { MqttService } from './mqtt.service';
import { AuthService } from '@services/auth/auth.service';
import { DeviceService } from '@services/device/device.service';
import { SigV4Service } from '@services/sig-v4/sig-v4.service';
import { MqttMessageType,
         MqttCommandType } from '@models';


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

jest.mock('mqtt', () => ({
  connect: jest.fn(() => mockMqttClient)
}));

jest.mock('@env/environment', () => ({
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

describe('MqttService', () => {
  let service: MqttService;
  let authService: jest.Mocked<AuthService>;
  let deviceService: jest.Mocked<DeviceService>;
  let sigV4Service: jest.Mocked<SigV4Service>;

  const mockSessionData = {
    identityId: 'test-identity-id',
    tokens: {
      idToken: {
        payload: {
          'custom:Company': 'test-company'
        }
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockMqttClient.connected = false;

    authService = {
      hasPolicy: jest.fn(() => true),
      company: jest.fn(() => 'test-company'),
      isSessionTokenExpired: jest.fn(() => false),
      sessionData: jest.fn()
    } as any;

    deviceService = {
      onAlarm: jest.fn(),
      onConfiguration: jest.fn(),
      serialNumber: jest.fn(() => 'device-123'),
      generateCid: jest.fn(() => 'cid-12345')
    } as any;

    sigV4Service = {
      getSignedURL: jest.fn(() => 'wss://test-signed-url')
    } as any;

    TestBed.configureTestingModule({
      providers: [
        MqttService,
        { provide: AuthService, useValue: authService },
        { provide: DeviceService, useValue: deviceService },
        { provide: SigV4Service, useValue: sigV4Service }
      ]
    });

    service = TestBed.inject(MqttService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default state', () => {
      expect(service.isConnected).toBe(false);
      expect(service.messages$).toBeInstanceOf(BehaviorSubject);
      expect(service.messages$.value).toBeNull();
    });

    it('should setup message handlers during initialization', () => {
      expect(deviceService.onAlarm).not.toHaveBeenCalled();
      expect(deviceService.onConfiguration).not.toHaveBeenCalled();
    });
  });

  describe('Connection Management', () => {
    describe('connect()', () => {
      it('should return early if already connected', async () => {
        mockMqttClient.connected = true;
        (service as any).client = mockMqttClient;
        
        await service.connect(mockSessionData as any);
        
        expect(mqtt.connect).not.toHaveBeenCalled();
      });

      it('should establish new connection successfully', async () => {
        const connectPromise = service.connect(mockSessionData as any);
        
        const connectCallback = mockMqttClient.once.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        
        connectCallback?.();
        
        await connectPromise;
        
        expect(mqtt.connect).toHaveBeenCalledWith('wss://test-signed-url', {
          clientId: 'test-identity-id',
          protocolId: 'MQTT',
          protocolVersion: 5,
          port: 443,
          clean: true,
          reconnectPeriod: 0,
          connectTimeout: 10 * 1000,
          keepalive: 30,
          rejectUnauthorized: true
        });
        expect(sigV4Service.getSignedURL).toHaveBeenCalledWith(mockSessionData);
      });

      it('should handle connection errors', async () => {
        const connectPromise = service.connect(mockSessionData as any);
        
        const errorCallback = mockMqttClient.once.mock.calls.find(
          call => call[0] === 'error'
        )?.[1];
        
        const testError = new Error('Connection failed');
        errorCallback?.(testError);
        
        await expect(connectPromise).rejects.toThrow('Connection failed');
      });

      it('should wait for existing connection promise', async () => {
        const firstConnectPromise = service.connect(mockSessionData as any);
        const secondConnectPromise = service.connect(mockSessionData as any);
        
        expect(firstConnectPromise).toStrictEqual(secondConnectPromise);
        
        const connectCallback = mockMqttClient.once.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        connectCallback?.();
        
        await Promise.all([firstConnectPromise, secondConnectPromise]);
      });
    });

    describe('disconnect()', () => {
      it('should handle disconnect when no client exists', async () => {
        await expect(service.disconnect()).resolves.toBeUndefined();
      });

      it('should disconnect gracefully when client exists', async () => {
        (service as any).client = mockMqttClient;
        mockMqttClient.connected = true;
        
        const disconnectPromise = service.disconnect();
        
        const endCallback = mockMqttClient.end.mock.calls[0]?.[2];
        endCallback?.();
        
        await disconnectPromise;
        
        expect(mockMqttClient.removeAllListeners).toHaveBeenCalled();
        expect(mockMqttClient.end).toHaveBeenCalledWith(true, {}, expect.any(Function));
      });

      it('should clear pending requests on disconnect', async () => {
        (service as any).client = mockMqttClient;
        mockMqttClient.connected = true;
        
        const mockReject = jest.fn();
        const mockTimeout = setTimeout(() => {}, 1000);
        
        (service as any).pendingRequests = {
          'test-cid': {
            resolve: jest.fn(),
            reject: mockReject,
            timeout: mockTimeout
          }
        };
        
        const disconnectPromise = service.disconnect();
        
        const endCallback = mockMqttClient.end.mock.calls[0]?.[2];
        if (endCallback) {
          endCallback();
        }
        
        await disconnectPromise;
        
        expect(mockReject).toHaveBeenCalledWith(
          new Error('[MqttService]: connection closed')
        );
        expect((service as any).pendingRequests['test-cid']).toBeUndefined();
      });
    });

    describe('isConnected getter', () => {
      it('should return false when no client', () => {
        expect(service.isConnected).toBe(false);
      });

      it('should return client connection status', () => {
        (service as any).client = mockMqttClient;
        
        mockMqttClient.connected = true;
        expect(service.isConnected).toBe(true);
        
        mockMqttClient.connected = false;
        expect(service.isConnected).toBe(false);
      });
    });

    describe('isConnecting getter', () => {
      it('should return false when no connection promise', () => {
        expect(service.isConnecting).toBe(false);
      });

      it('should return true when connection is in progress', async () => {
        const connectPromise = service.connect(mockSessionData as any);
        
        expect(service.isConnecting).toBe(true);
        
        const connectCallback = mockMqttClient.once.mock.calls.find(
          call => call[0] === 'connect'
        )?.[1];
        connectCallback?.();
        
        await connectPromise;
        
        expect(service.isConnecting).toBe(false);
      });
    });
  });

  describe('Message Handling', () => {
    describe('onMessageOfType()', () => {
      it('should filter messages by single type', async () => {
        const observable = service.onMessageOfType(MqttMessageType.ALARM);
        
        service.messages$.next({
          type: MqttMessageType.ALARM,
          timestamp: 1756816515275,
          sn: 'device-123',
          data: { distance: 18 }
        } as any);
        
        const message = await firstValueFrom(observable.pipe(take(1)));
        expect(message.type).toBe(MqttMessageType.ALARM);
      });

      it('should filter messages by multiple types', async () => {
        const observable = service.onMessageOfType([
          MqttMessageType.ALARM, 
          MqttMessageType.CONFIGURATION
        ]);
        
        service.messages$.next({
          type: MqttMessageType.CONFIGURATION,
          timestamp: 1756816515275,
          sn: 'device-123',
          data: { distance: 18 }
        } as any);
        
        const message = await firstValueFrom(observable.pipe(take(1)));
        expect(message.type).toBe(MqttMessageType.CONFIGURATION);
      });

      it('should filter messages by device serial number', async () => {
        const observable = service.onMessageOfType(MqttMessageType.ALARM, 'device-456');
        
        service.messages$.next({
          type: MqttMessageType.ALARM,
          timestamp: 1756816515275,
          sn: 'device-123',
          data: { distance: 18 }
        } as any);
        
        service.messages$.next({
          type: MqttMessageType.ALARM,
          timestamp: 1756816515275,
          sn: 'device-456',
          data: { distance: 15 }
        } as any);
        
        const message = await firstValueFrom(observable.pipe(take(1)));
        expect(message.sn).toBe('device-456');
      });
    });

    describe('handleIncomingMessage()', () => {
      beforeEach(() => {
        (service as any).client = mockMqttClient;
      });

      it('should parse and emit valid messages', () => {
        const testMessage = {
          sn: 'MAS-EC357A188534',
          timestamp: 1756816515275,
          type: 0,
          data: {
            distance: 18
          }
        };
        
        const messageBuffer = Buffer.from(JSON.stringify(testMessage));
        (service as any).handleIncomingMessage(messageBuffer);
        
        expect(service.messages$.value).toEqual(testMessage);
      });

      it('should resolve pending requests with correlation ID', () => {
        const mockResolve = jest.fn();
        const mockTimeout = setTimeout(() => {}, 1000);
        
        (service as any).pendingRequests['test-cid'] = {
          resolve: mockResolve,
          reject: jest.fn(),
          timeout: mockTimeout
        };
        
        const testMessage = {
          type: MqttMessageType.ACKNOWLEGDE,
          timestamp: 1756816515275,
          cid: 'test-cid'
        };
        
        const messageBuffer = Buffer.from(JSON.stringify(testMessage));
        (service as any).handleIncomingMessage(messageBuffer);
        
        expect(mockResolve).toHaveBeenCalledWith(testMessage);
        expect((service as any).pendingRequests['test-cid']).toBeUndefined();
      });

      it('should handle invalid JSON gracefully', () => {
        const invalidBuffer = Buffer.from('invalid json');
        
        expect(() => {
          (service as any).handleIncomingMessage(invalidBuffer);
        }).not.toThrow();
        
        expect(service.messages$.value).toBeNull();
      });
    });
  });

  describe('Command Sending', () => {
    describe('sendCommand()', () => {
      beforeEach(() => {
        (service as any).client = mockMqttClient;
        mockMqttClient.connected = true;
      });

      it('should reject when not connected', async () => {
        mockMqttClient.connected = false;
        
        await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION, {}))
          .rejects.toThrow('[MqttService]: MQTT client is not connected');
      });

      it('should reject when company is missing', async () => {
        authService.company.mockReturnValue('');
        
        await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION, {}))
          .rejects.toThrow('[MqttService]: missing company or device serial number');
      });

      it('should reject when device serial number is missing', async () => {
        deviceService.serialNumber.mockReturnValue('');
        
        await expect(service.sendCommand(MqttCommandType.SET_CONFIGURATION, {}))
          .rejects.toThrow('[MqttService]: missing company or device serial number');
      });

      it('should send command successfully', async () => {
        const testPayload = { distance: 18 };
        
        const commandPromise = service.sendCommand(MqttCommandType.SET_CONFIGURATION, testPayload);
        
        const publishCallback = mockMqttClient.publish.mock.calls[0]?.[2];
        publishCallback?.(null);
        
        setTimeout(() => {
          const responseMessage = {
            type: MqttMessageType.ACKNOWLEGDE,
            cid: 'cid-12345'
          };
          const messageBuffer = Buffer.from(JSON.stringify(responseMessage));
          (service as any).handleIncomingMessage(messageBuffer);
        }, 0);
        
        const result = await commandPromise;
        
        expect(mockMqttClient.publish).toHaveBeenCalledWith(
          'companies/test-company/devices/device-123/commands',
          JSON.stringify({
            type: MqttCommandType.SET_CONFIGURATION,
            cid: 'cid-12345',
            ...testPayload
          }),
          expect.any(Function)
        );
        expect((result as any).type).toBe(MqttMessageType.ACKNOWLEGDE);
        expect((result as any).cid).toBe('cid-12345');
      });

      it('should handle publish errors', async () => {
        const publishError = new Error('Publish failed');
        
        const commandPromise = service.sendCommand(MqttCommandType.SET_CONFIGURATION, {});
        
        const publishCallback = mockMqttClient.publish.mock.calls[0]?.[2];
        publishCallback?.(publishError);
        
        await expect(commandPromise).rejects.toThrow('Publish failed');
      });

      it('should timeout pending requests', async () => {
        let timeoutCallback: Function;
        jest.spyOn(global, 'setTimeout').mockImplementation((fn: any, delay?: number) => {
          if (delay === 5000) { 
            timeoutCallback = fn;
            return 999 as any; 
          }
          return setTimeout(fn, delay!);
        });
        
        const commandPromise = service.sendCommand(MqttCommandType.SET_CONFIGURATION, {});
        
        const publishCallback = mockMqttClient.publish.mock.calls[0]?.[2];
        publishCallback?.(null);
        
        timeoutCallback!();
        
        await expect(commandPromise).rejects.toThrow('[MqttService]: MQTT request timeout');
        
        jest.restoreAllMocks();
      }, 10000);
    });
  });

  describe('Session Change Handling', () => {
    describe('handleSessionChange()', () => {
      it('should disconnect when session is null', async () => {
        const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
        
        await service.handleSessionChange(null);
        
        expect(disconnectSpy).toHaveBeenCalled();
      });

      it('should connect when session is provided', async () => {
        const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
        
        await service.handleSessionChange(mockSessionData as any);
        
        expect(connectSpy).toHaveBeenCalledWith(mockSessionData);
      });

      it('should log appropriate messages for session changes', async () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const connectSpy = jest.spyOn(service, 'connect').mockResolvedValue();
        const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
        
        (service as any).client = mockMqttClient;
        mockMqttClient.connected = true;
        
        await service.handleSessionChange(mockSessionData as any);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          '[MqttService]: current connection status: connected'
        );
        expect(consoleSpy).toHaveBeenCalledWith(
          '[MqttService]: session data available, attempting to connect...'
        );
        expect(connectSpy).toHaveBeenCalledWith(mockSessionData);
        
        await service.handleSessionChange(null);
        
        expect(consoleSpy).toHaveBeenCalledWith(
          '[MqttService]: no session data, disconnecting...'
        );
        expect(disconnectSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources by calling disconnect', async () => {
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      
      await service.cleanup();
      
      expect(disconnectSpy).toHaveBeenCalledWith(true);
    });

    it('should clear pending requests on cleanup', async () => {
      const mockReject = jest.fn();
      const mockTimeout = setTimeout(() => {}, 1000);
      
      (service as any).pendingRequests = {
        'test-cid': {
          resolve: jest.fn(),
          reject: mockReject,
          timeout: mockTimeout
        }
      };
      
      jest.spyOn(service, 'disconnect').mockResolvedValue();
      
      await service.cleanup();
      
      expect(mockReject).toHaveBeenCalledWith(
        new Error('[MqttService]: connection closed')
      );
      expect((service as any).pendingRequests['test-cid']).toBeUndefined();
    });

    it('should pass immediate parameter to disconnect', async () => {
      const disconnectSpy = jest.spyOn(service, 'disconnect').mockResolvedValue();
      
      await service.cleanup(false);
      
      expect(disconnectSpy).toHaveBeenCalledWith(false);
    });
  });

  describe('Client Event Handlers', () => {
    beforeEach(() => {
      (service as any).client = mockMqttClient;
    });

    it('should setup client event handlers', () => {
      (service as any).setupClientEventHandlers(mockSessionData);
      
      expect(mockMqttClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('message', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('reconnect', expect.any(Function));
      expect(mockMqttClient.on).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should remove client event handlers', () => {
      (service as any).removeClientEventHandlers();
      
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('connect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('message');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('error');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('disconnect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('close');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('reconnect');
      expect(mockMqttClient.removeAllListeners).toHaveBeenCalledWith('offline');
    });

    it('should handle connect event and subscribe to topics', () => {
      (service as any).setupClientEventHandlers(mockSessionData);
      
      const connectHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'connect'
      )?.[1];
      
      connectHandler?.();
      
      expect(mockMqttClient.subscribe).toHaveBeenCalledWith(
        'companies/test-company/events',
        expect.any(Function)
      );
    });

    it('should handle message event', () => {
      (service as any).setupClientEventHandlers(mockSessionData);
      
      const messageHandler = mockMqttClient.on.mock.calls.find(
        call => call[0] === 'message'
      )?.[1];
      
      const testMessage = { type: MqttMessageType.ALARM, data: {} };
      const messageBuffer = Buffer.from(JSON.stringify(testMessage));
      
      messageHandler?.('test-topic', messageBuffer);
      
      expect(service.messages$.value).toEqual(testMessage);
    });
  });
});