import { TestBed } from '@angular/core/testing';
import { NgZone,
         signal } from '@angular/core';

import { AuthConnectionManagerService } from './auth-connection-manager.service';
import { AuthService } from '@services/auth/auth.service';
import { MqttService } from '@services/mqtt/mqtt.service';
import { PolicyService } from '@services/policy/policy.service';
import { WINDOW } from '@tokens/window';
import { MainProcessEvent } from '@shared-with-electron';

describe('AuthConnectionManagerService', () => {

  let service: AuthConnectionManagerService;
  let authService: jest.Mocked<AuthService>;
  let mqttService: jest.Mocked<MqttService>;
  let policyService: jest.Mocked<PolicyService>;
  let mockWindow: any;
  let ngZone: NgZone;

  const mockSessionData = {
    identityId: 'test-identity-id',
    tokens: {
      idToken: {
        payload: {
          'custom:Company': 'test-company'
        }
      },
      accessToken: {
        payload: {}
      }
    }
  } as any;

  beforeEach(() => {
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => key === 'debug' ? 'true' : null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });

    mockWindow = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
      electron: {
        ipcRenderer: {
          on: jest.fn(),
          off: jest.fn()
        }
      }
    };

    const sessionDataSignal = signal(null);
    authService = {
      fetchSession: jest.fn(),
      isSessionTokenExpired: jest.fn(() => false),
      sessionData: sessionDataSignal,
      hasPolicy: jest.fn(() => true)
    } as any;

    mqttService = {
      handleSessionChange: jest.fn(),
      cleanup: jest.fn(),
      get isConnected() { return false; },
      get isConnecting() { return false; }
    } as any;

    policyService = {
      attachPolicy: jest.fn().mockResolvedValue(undefined)
    } as any;

    TestBed.configureTestingModule({
      providers: [
        AuthConnectionManagerService,
        { provide: AuthService, useValue: authService },
        { provide: MqttService, useValue: mqttService },
        { provide: PolicyService, useValue: policyService },
        { provide: WINDOW, useValue: mockWindow }
      ]
    });

    ngZone = TestBed.inject(NgZone);
    service = TestBed.inject(AuthConnectionManagerService);
  });

  describe('Service Initialization', () => {

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should initialize system handlers for electron environment', () => {
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith(
        MainProcessEvent.SYSTEM_RESUMED, 
        expect.any(Function)
      );
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith(
        MainProcessEvent.STATUS_CHECK, 
        expect.any(Function)
      );
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith(
        MainProcessEvent.SYSTEM_SUSPENDED, 
        expect.any(Function)
      );
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith(
        MainProcessEvent.SYSTEM_ONLINE, 
        expect.any(Function)
      );
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith(
        MainProcessEvent.SYSTEM_OFFLINE, 
        expect.any(Function)
      );
    });

    it('should initialize browser event handlers', () => {
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'offline', 
        expect.any(Function)
      );
      expect(mockWindow.addEventListener).toHaveBeenCalledWith(
        'online', 
        expect.any(Function)
      );
    });

    it('should setup auth handlers with effect', () => {
      expect(mqttService.handleSessionChange).not.toHaveBeenCalled();
    });

  });

  describe('Electron IPC Event Handling', () => {
    let statusCheckHandler: Function;
    let systemResumedHandler: Function;
    let systemSuspendedHandler: Function;
    let systemOnlineHandler: Function;
    let systemOfflineHandler: Function;

    beforeEach(() => {
      const ipcCalls = mockWindow.electron.ipcRenderer.on.mock.calls;
      statusCheckHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.STATUS_CHECK)?.[1];
      systemResumedHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.SYSTEM_RESUMED)?.[1];
      systemSuspendedHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.SYSTEM_SUSPENDED)?.[1];
      systemOnlineHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.SYSTEM_ONLINE)?.[1];
      systemOfflineHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.SYSTEM_OFFLINE)?.[1];
    });

    describe('STATUS_CHECK event', () => {
      it('should trigger onStatusCheck method', () => {
        const onStatusCheckSpy = jest.spyOn(service, 'onStatusCheck').mockResolvedValue();
        
        statusCheckHandler();
        
        expect(onStatusCheckSpy).toHaveBeenCalled();
      });

    });

    describe('SYSTEM_RESUMED event', () => {
      it('should call onSystemEvent with SYSTEM_RESUMED', () => {
        const onSystemEventSpy = jest.spyOn(service, 'onSystemEvent').mockResolvedValue();
        
        systemResumedHandler();
        
        expect(onSystemEventSpy).toHaveBeenCalledWith(MainProcessEvent.SYSTEM_RESUMED);
      });

    });

    describe('SYSTEM_SUSPENDED event', () => {
      it('should call onSystemEvent with SYSTEM_SUSPENDED', () => {
        const onSystemEventSpy = jest.spyOn(service, 'onSystemEvent').mockResolvedValue();
        
        systemSuspendedHandler();
        
        expect(onSystemEventSpy).toHaveBeenCalledWith(MainProcessEvent.SYSTEM_SUSPENDED);
      });
    });

    describe('SYSTEM_ONLINE event', () => {
      it('should call onSystemEvent with SYSTEM_ONLINE', () => {
        const onSystemEventSpy = jest.spyOn(service, 'onSystemEvent').mockResolvedValue();
        
        systemOnlineHandler();
        
        expect(onSystemEventSpy).toHaveBeenCalledWith(MainProcessEvent.SYSTEM_ONLINE);
      });
    });

    describe('SYSTEM_OFFLINE event', () => {
      it('should call onSystemEvent with SYSTEM_OFFLINE', () => {
        const onSystemEventSpy = jest.spyOn(service, 'onSystemEvent').mockResolvedValue();
        
        systemOfflineHandler();
        
        expect(onSystemEventSpy).toHaveBeenCalledWith(MainProcessEvent.SYSTEM_OFFLINE);
      });

    });

  });

  describe('Browser Event Handling', () => {

    let onlineHandler: Function;
    let offlineHandler: Function;

    beforeEach(() => {
      const eventCalls = mockWindow.addEventListener.mock.calls;
      onlineHandler = eventCalls.find((call: any[]) => call[0] === 'online')?.[1];
      offlineHandler = eventCalls.find((call: any[]) => call[0] === 'offline')?.[1];
    });

    describe('online event', () => {
      it('should set online state', () => {
        onlineHandler();
        
        const privateService = service as any;
        expect(privateService.online).toBe(true);
        
      });
    });

    describe('offline event', () => {
      it('should set offline state and cleanup MQTT', async () => {
        const privateService = service as any;
        expect(privateService.online).toBe(true);
        
        service.onSystemEvent(MainProcessEvent.SYSTEM_OFFLINE);
        
        expect(privateService.online).toBe(false);
        expect(mqttService.cleanup).toHaveBeenCalled();
      });

      it('should not refresh session when offline', async () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        
        const privateService = service as any;
        privateService.online = false;
        
        expect(privateService.shouldRefreshSession()).toBe(false);
        expect(authService.fetchSession).not.toHaveBeenCalled();
      });
    });

  });

  describe('Session Refresh Logic', () => {

    describe('shouldRefreshSession()', () => {
      it('should return true when session is expired and conditions are met', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.isSessionTokenExpired.mockReturnValue(true);
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshSession()).toBe(true);
      });

      it('should return false when session is not expired', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.isSessionTokenExpired.mockReturnValue(false);
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshSession()).toBe(false);
      });

      it('should return false when offline', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.isSessionTokenExpired.mockReturnValue(true);
        
        const privateService = service as any;
        privateService.online = false;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshSession()).toBe(false);
      });

      it('should return false when system is suspended', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.isSessionTokenExpired.mockReturnValue(true);
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = false;
        
        expect(privateService.shouldRefreshSession()).toBe(false);
      });

      it('should return false when no session data', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(null);
        
        authService.isSessionTokenExpired.mockReturnValue(true);
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshSession()).toBe(false);
      });
    });

    describe('shouldRefreshMqttConnection()', () => {
      it('should return true when all conditions are met', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.hasPolicy.mockReturnValue(true);
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        Object.defineProperty(mqttService, 'isConnecting', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshMqttConnection()).toBe(true);
      });

      it('should return false when no session data', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(null);
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshMqttConnection()).toBe(false);
      });

      it('should return false when user has no policy', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.hasPolicy.mockReturnValue(false);
        authService.isSessionTokenExpired.mockReturnValue(false);
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshMqttConnection()).toBe(false);
      });

      it('should return false when session token is expired', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.hasPolicy.mockReturnValue(true);
        authService.isSessionTokenExpired.mockReturnValue(true);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        Object.defineProperty(mqttService, 'isConnecting', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshMqttConnection()).toBe(false);
      });

      it('should return false when MQTT is already connected', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.hasPolicy.mockReturnValue(true);
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => true, configurable: true });
        Object.defineProperty(mqttService, 'isConnecting', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshMqttConnection()).toBe(false);
      });

      it('should return false when MQTT is connecting', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.hasPolicy.mockReturnValue(true);
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        Object.defineProperty(mqttService, 'isConnecting', { get: () => true, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshMqttConnection()).toBe(false);
      });

      it('should return false when offline', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.hasPolicy.mockReturnValue(true);
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        Object.defineProperty(mqttService, 'isConnecting', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = false;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshMqttConnection()).toBe(false);
      });

      it('should return false when system is suspended', () => {
        const sessionDataSignal = authService.sessionData as any;
        sessionDataSignal.set(mockSessionData);
        
        authService.hasPolicy.mockReturnValue(true);
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        Object.defineProperty(mqttService, 'isConnecting', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = false;
        
        expect(privateService.shouldRefreshMqttConnection()).toBe(false);
      });
    });
  });

  describe('System Event Processing', () => {

    let privateService: any;

    beforeEach(() => {
      privateService = service as any;
    });

    describe('SYSTEM_RESUMED processing', () => {
      it('should set resumed state to true', async () => {
        privateService.resumed = false;
        
        await privateService.onSystemEvent(MainProcessEvent.SYSTEM_RESUMED);
        
        expect(privateService.resumed).toBe(true);
      });
    });

    describe('SYSTEM_SUSPENDED processing', () => {
      it('should set suspended state and cleanup MQTT', async () => {
        privateService.resumed = true;
        
        await privateService.onSystemEvent(MainProcessEvent.SYSTEM_SUSPENDED);
        
        expect(privateService.resumed).toBe(false);
        expect(mqttService.cleanup).toHaveBeenCalledWith(true);
      });
    });

    describe('SYSTEM_ONLINE processing', () => {
      it('should set online state to true', async () => {
        privateService.online = false;
        
        await privateService.onSystemEvent(MainProcessEvent.SYSTEM_ONLINE);
        
        expect(privateService.online).toBe(true);
      });
    });

    describe('SYSTEM_OFFLINE processing', () => {
      it('should set offline state and cleanup MQTT', async () => {
        privateService.online = true;
        
        await service.onSystemEvent(MainProcessEvent.SYSTEM_OFFLINE);
        
        expect(privateService.online).toBe(false);
        expect(mqttService.cleanup).toHaveBeenCalledWith(true);
      });
    });

  });

  describe('NgZone Integration', () => {

    it('should execute IPC event handlers within NgZone', () => {
      const zoneSpy = jest.spyOn(ngZone, 'run');
      
      const statusCheckHandler = mockWindow.electron.ipcRenderer.on.mock.calls
        .find((call: any[]) => call[0] === MainProcessEvent.STATUS_CHECK)?.[1];
      
      statusCheckHandler();
      
      expect(zoneSpy).toHaveBeenCalled();
    });

    it('should execute browser event handlers within NgZone', () => {
      const zoneSpy = jest.spyOn(ngZone, 'run');
      
      const onlineHandler = mockWindow.addEventListener.mock.calls
        .find((call: any[]) => call[0] === 'online')?.[1];
      
      onlineHandler();
      
      expect(zoneSpy).toHaveBeenCalled();
    });

  });

  describe('Auth Session Handling', () => {

    let sessionDataSignal: any;

    beforeEach(() => {
      sessionDataSignal = authService.sessionData as any;
      jest.clearAllMocks();
    });

    it('should not take action when user has policy', async () => {
      authService.hasPolicy.mockReturnValue(true);
      
      sessionDataSignal.set(mockSessionData);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(policyService.attachPolicy).not.toHaveBeenCalled();
      expect(authService.fetchSession).not.toHaveBeenCalled();
      expect(mqttService.cleanup).not.toHaveBeenCalled();
    });

    it('should attach policy and refresh session when user has no policy', async () => {
      authService.hasPolicy.mockReturnValue(false);
      
      sessionDataSignal.set(mockSessionData);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(policyService.attachPolicy).toHaveBeenCalled();
      expect(authService.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
    });

    it('should cleanup MQTT when session is null', async () => {
      sessionDataSignal.set(null);
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(mqttService.cleanup).toHaveBeenCalledWith(false);
      expect(policyService.attachPolicy).not.toHaveBeenCalled();
      expect(authService.fetchSession).not.toHaveBeenCalled();
    });

  });

  describe('Non-Electron Environment', () => {

    beforeEach(() => {
      const mockWindowWithoutElectron = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthConnectionManagerService,
          { provide: AuthService, useValue: authService },
          { provide: MqttService, useValue: mqttService },
          { provide: PolicyService, useValue: policyService },
          { provide: WINDOW, useValue: mockWindowWithoutElectron }
        ]
      });

      service = TestBed.inject(AuthConnectionManagerService);
    });

    it('should still handle browser events when electron is not available', () => {
      const mockWindowWithoutElectron = TestBed.inject(WINDOW);
      
      expect(mockWindowWithoutElectron.addEventListener).toHaveBeenCalledWith(
        'online', 
        expect.any(Function)
      );
      expect(mockWindowWithoutElectron.addEventListener).toHaveBeenCalledWith(
        'offline', 
        expect.any(Function)
      );
    });

    it('should not attempt to set up IPC handlers when electron is unavailable', () => {
      const mockWindowWithoutElectron = TestBed.inject(WINDOW);
      
      expect(mockWindowWithoutElectron.electron).toBeUndefined();
    });

  });
  
});
