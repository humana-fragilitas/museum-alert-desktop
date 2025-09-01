import { TestBed } from '@angular/core/testing';

import { MqttService } from './mqtt.service';
import { AuthService } from '@services/auth/auth.service';
import { DeviceService } from '@services/device/device.service';
import { SigV4Service } from '@services/sig-v4/sig-v4.service';
import { WINDOW } from '@tokens/window';


// Mock mqtt module
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
  let sigV4Service: any;
  let notificationService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock services
    authService = {
      sessionData: jest.fn(() => null),
      hasPolicy: jest.fn(() => true),
      company: jest.fn(() => 'test-company'),
      isSessionTokenExpired: jest.fn(() => false)
    };

    deviceService = {
      onAlarm: jest.fn(),
      onConfiguration: jest.fn(),
      serialNumber: jest.fn(() => 'device-sn'),
      generateCid: jest.fn(() => 'cid-1')
    };

    sigV4Service = {
      getSignedURL: jest.fn(() => 'wss://test-url')
    };

    notificationService = {
      onError: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        MqttService,
        { provide: AuthService, useValue: authService },
        { provide: DeviceService, useValue: deviceService },
        { provide: SigV4Service, useValue: sigV4Service },
        { provide: 'NotificationService', useValue: notificationService },
        { provide: WINDOW, useValue: mockWindow }
      ]
    });

    service = TestBed.inject(MqttService);
  });

  describe('Service Initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize with default values', () => {
      expect(service.isConnected).toBe(false);
    });
  });

  describe('Connection Status', () => {
    it('should return false when no client exists', () => {
      expect(service.isConnected).toBe(false);
    });

    it('should return client connected status when client exists', () => {
      (service as any).client = mockMqttClient;
      mockMqttClient.connected = true;
      expect(service.isConnected).toBe(true);

      mockMqttClient.connected = false;
      expect(service.isConnected).toBe(false);
    });
  });

  describe('Basic Methods', () => {
    it('should handle disconnect when no client exists', async () => {
      await expect(service.disconnect()).resolves.toBeUndefined();
    });

    it('should handle sendCommand when prerequisites are missing', async () => {
      authService.company.mockReturnValue(null);
      await expect(service.sendCommand('SET_CONFIGURATION' as any))
        .rejects.toThrow();
    });
  });
});