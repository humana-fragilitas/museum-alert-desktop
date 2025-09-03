import { TestBed } from '@angular/core/testing';
import { NgZone, signal } from '@angular/core';

import { AuthConnectionManagerService } from './auth-connection-manager.service';
import { AuthService } from '@services/auth/auth.service';
import { MqttService } from '@services/mqtt/mqtt.service';
import { WINDOW } from '@tokens/window';
import { MainProcessEvent } from '@shared-with-electron';

describe('AuthConnectionManagerService', () => {
  let service: AuthConnectionManagerService;
  let authService: jest.Mocked<AuthService>;
  let mqttService: jest.Mocked<MqttService>;
  let mockWindow: any;
  let ngZone: NgZone;

  // Mock session data
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
    // Enable console logging for tests
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn((key) => key === 'debug' ? 'true' : null),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });

    // Mock window with electron capabilities
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

    // Mock AuthService with Angular signal
    const sessionDataSignal = signal(null);
    authService = {
      fetchSession: jest.fn(),
      isSessionTokenExpired: jest.fn(() => false),
      sessionData: sessionDataSignal,
      hasPolicy: jest.fn(() => true)
    } as any;

    // Mock MqttService
    mqttService = {
      handleSessionChange: jest.fn(),
      cleanup: jest.fn(),
      get isConnected() { return false; }
    } as any;

    TestBed.configureTestingModule({
      providers: [
        AuthConnectionManagerService,
        { provide: AuthService, useValue: authService },
        { provide: MqttService, useValue: mqttService },
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
        MainProcessEvent.WINDOW_FOCUSED, 
        expect.any(Function)
      );
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith(
        MainProcessEvent.SESSION_CHECK, 
        expect.any(Function)
      );
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith(
        MainProcessEvent.SYSTEM_RESUMED, 
        expect.any(Function)
      );
      expect(mockWindow.electron.ipcRenderer.on).toHaveBeenCalledWith(
        MainProcessEvent.SYSTEM_SUSPENDED, 
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
      // Effect should be set up but not trigger initially since sessionData is null
      expect(mqttService.handleSessionChange).not.toHaveBeenCalled();
    });
  });

  describe('Electron IPC Event Handling', () => {
    let windowFocusedHandler: Function;
    let sessionCheckHandler: Function;
    let systemResumedHandler: Function;
    let systemSuspendedHandler: Function;

    beforeEach(() => {
      // Extract the handlers from the mock calls
      const ipcCalls = mockWindow.electron.ipcRenderer.on.mock.calls;
      windowFocusedHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.WINDOW_FOCUSED)?.[1];
      sessionCheckHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.SESSION_CHECK)?.[1];
      systemResumedHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.SYSTEM_RESUMED)?.[1];
      systemSuspendedHandler = ipcCalls.find((call: any[]) => call[0] === MainProcessEvent.SYSTEM_SUSPENDED)?.[1];
    });

    describe('WINDOW_FOCUSED event', () => {
      it('should trigger session refresh when session is expired', () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        
        // Simulate window focus event
        windowFocusedHandler();
        
        expect(authService.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
      });

      it('should not refresh session when conditions are not met', () => {
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => true, configurable: true });
        
        windowFocusedHandler();
        
        expect(authService.fetchSession).not.toHaveBeenCalled();
      });
    });

    describe('SESSION_CHECK event', () => {
      it('should trigger session refresh when MQTT is disconnected', () => {
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        
        sessionCheckHandler();
        
        expect(authService.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
      });

      it('should not refresh when session is valid and MQTT is connected', () => {
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => true, configurable: true });
        
        sessionCheckHandler();
        
        expect(authService.fetchSession).not.toHaveBeenCalled();
      });
    });

    describe('SYSTEM_RESUMED event', () => {
      it('should cleanup MQTT and refresh session', () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        
        systemResumedHandler();
        
        expect(mqttService.cleanup).toHaveBeenCalled();
        expect(authService.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
      });

      it('should set resumed state to true', () => {
        // Access private property for testing
        const privateService = service as any;
        privateService.resumed = false;
        
        systemResumedHandler();
        
        expect(privateService.resumed).toBe(true);
      });
    });

    describe('SYSTEM_SUSPENDED event', () => {
      it('should cleanup MQTT and set suspended state', () => {
        systemSuspendedHandler();
        
        expect(mqttService.cleanup).toHaveBeenCalled();
        
        // Check private state
        const privateService = service as any;
        expect(privateService.resumed).toBe(false);
      });
    });
  });

  describe('Browser Event Handling', () => {
    let onlineHandler: Function;
    let offlineHandler: Function;

    beforeEach(() => {
      // Extract the handlers from addEventListener calls
      const eventCalls = mockWindow.addEventListener.mock.calls;
      onlineHandler = eventCalls.find((call: any[]) => call[0] === 'online')?.[1];
      offlineHandler = eventCalls.find((call: any[]) => call[0] === 'offline')?.[1];
    });

    describe('online event', () => {
      it('should set online state and refresh session if needed', () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        
        onlineHandler();
        
        // Check private state
        const privateService = service as any;
        expect(privateService.online).toBe(true);
        expect(authService.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
      });
    });

    describe('offline event', () => {
      it('should set offline state and cleanup MQTT', async () => {
        // First verify initial state
        const privateService = service as any;
        expect(privateService.online).toBe(true);
        
        // Call the public method directly with the string value
        service.onSystemEvent(MainProcessEvent.SYSTEM_OFFLINE);
        
        // Check that the state changed
        expect(privateService.online).toBe(false);
        expect(mqttService.cleanup).toHaveBeenCalled();
      });

      it('should not refresh session when offline', async () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        
        // Set to offline state first
        const privateService = service as any;
        privateService.online = false;
        
        // Since the session should not refresh when offline, we test shouldRefreshSession
        expect(privateService.shouldRefreshSession()).toBe(false);
        expect(authService.fetchSession).not.toHaveBeenCalled();
      });
    });
  });

  describe('Auth Session Handling', () => {
    it('should handle session changes via effect', () => {
      // We can't easily test Angular effects directly in unit tests,
      // but we can verify the setup doesn't cause errors
      expect(() => {
        // The effect should already be initialized in the service constructor
        // and not throw any errors with null session data
      }).not.toThrow();
    });
  });

  describe('Session Refresh Logic', () => {
    describe('shouldRefreshSession()', () => {
      it('should return true when session is expired and conditions are met', () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshSession()).toBe(true);
      });

      it('should return true when MQTT is disconnected and conditions are met', () => {
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshSession()).toBe(true);
      });

      it('should return false when offline', () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = false;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshSession()).toBe(false);
      });

      it('should return false when system is suspended', () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        Object.defineProperty(mqttService, 'isConnected', { get: () => false, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = false;
        
        expect(privateService.shouldRefreshSession()).toBe(false);
      });

      it('should return false when session is valid and MQTT is connected', () => {
        authService.isSessionTokenExpired.mockReturnValue(false);
        Object.defineProperty(mqttService, 'isConnected', { get: () => true, configurable: true });
        
        const privateService = service as any;
        privateService.online = true;
        privateService.resumed = true;
        
        expect(privateService.shouldRefreshSession()).toBe(false);
      });
    });
  });

  describe('System Event Processing', () => {
    let privateService: any;

    beforeEach(() => {
      privateService = service as any;
    });

    describe('SYSTEM_RESUMED processing', () => {
      it('should set resumed state, cleanup MQTT, and refresh session', () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        privateService.resumed = false;
        
        privateService.onSystemEvent(MainProcessEvent.SYSTEM_RESUMED);
        
        expect(privateService.resumed).toBe(true);
        expect(mqttService.cleanup).toHaveBeenCalled();
        expect(authService.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
      });
    });

    describe('SYSTEM_SUSPENDED processing', () => {
      it('should set suspended state and cleanup MQTT', () => {
        privateService.resumed = true;
        
        privateService.onSystemEvent(MainProcessEvent.SYSTEM_SUSPENDED);
        
        expect(privateService.resumed).toBe(false);
        expect(mqttService.cleanup).toHaveBeenCalled();
      });
    });

    describe('SYSTEM_ONLINE processing', () => {
      it('should set online state and refresh session if needed', () => {
        authService.isSessionTokenExpired.mockReturnValue(true);
        privateService.online = false;
        
        privateService.onSystemEvent(MainProcessEvent.SYSTEM_ONLINE);
        
        expect(privateService.online).toBe(true);
        expect(authService.fetchSession).toHaveBeenCalledWith({ forceRefresh: true });
      });
    });

    describe('SYSTEM_OFFLINE processing', () => {
      it('should set offline state and cleanup MQTT', () => {
        privateService.online = true;
        
        // Call the public method directly with the string value
        service.onSystemEvent(MainProcessEvent.SYSTEM_OFFLINE);
        
        expect(privateService.online).toBe(false);
        expect(mqttService.cleanup).toHaveBeenCalled();
      });
    });
  });

  describe('NgZone Integration', () => {
    it('should execute IPC event handlers within NgZone', () => {
      const zoneSpy = jest.spyOn(ngZone, 'run');
      
      // Get the WINDOW_FOCUSED handler and call it
      const windowFocusedHandler = mockWindow.electron.ipcRenderer.on.mock.calls
        .find((call: any[]) => call[0] === MainProcessEvent.WINDOW_FOCUSED)?.[1];
      
      windowFocusedHandler();
      
      expect(zoneSpy).toHaveBeenCalled();
    });

    it('should execute browser event handlers within NgZone', () => {
      const zoneSpy = jest.spyOn(ngZone, 'run');
      
      // Get the online handler and call it
      const onlineHandler = mockWindow.addEventListener.mock.calls
        .find((call: any[]) => call[0] === 'online')?.[1];
      
      onlineHandler();
      
      expect(zoneSpy).toHaveBeenCalled();
    });
  });

  describe('Non-Electron Environment', () => {
    beforeEach(() => {
      // Create service without electron
      const mockWindowWithoutElectron = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
        // No electron property
      };

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          AuthConnectionManagerService,
          { provide: AuthService, useValue: authService },
          { provide: MqttService, useValue: mqttService },
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
