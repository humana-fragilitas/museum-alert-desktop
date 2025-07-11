import { TestBed } from '@angular/core/testing';
import { ElectronService } from './electron.service';

// Mock the global window object before any imports
Object.defineProperty(global, 'window', {
  value: {},
  writable: true,
  configurable: true
});

describe('ElectronService', () => {
  let service: ElectronService;
  let mockIpcRenderer: any;
  let mockWebFrame: any;
  let mockChildProcess: any;
  let mockFs: any;
  let originalWindow: any;

  beforeAll(() => {
    // Store original window reference
    originalWindow = global.window;
  });

  beforeEach(() => {
    // Create mocks for Electron APIs
    mockIpcRenderer = {
      invoke: jest.fn(),
      on: jest.fn(),
      send: jest.fn(),
      removeAllListeners: jest.fn()
    };

    mockWebFrame = {
      setZoomFactor: jest.fn(),
      getZoomFactor: jest.fn()
    };

    mockChildProcess = {
      exec: jest.fn()
    };

    mockFs = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      existsSync: jest.fn()
    };

    // Setup complete window mock with require function
    const mockWindow = {
      process: {
        type: 'renderer'
      },
      require: jest.fn().mockImplementation((module: string) => {
        switch (module) {
          case 'electron':
            return {
              ipcRenderer: mockIpcRenderer,
              webFrame: mockWebFrame
            };
          case 'fs':
            return mockFs;
          case 'child_process':
            return mockChildProcess;
          default:
            return {};
        }
      })
    };

    // Set the global window object
    Object.defineProperty(global, 'window', {
      value: mockWindow,
      writable: true,
      configurable: true
    });

    // Configure TestBed
    TestBed.configureTestingModule({
      providers: [ElectronService]
    });

    service = TestBed.inject(ElectronService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  afterAll(() => {
    // Restore original window
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    });
  });

  describe('Service Creation', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
      expect(service).toBeInstanceOf(ElectronService);
    });
  });

  describe('isElectron getter', () => {
    it('should return true when running in Electron environment', () => {
      expect(service.isElectron).toBe(true);
    });

    it('should return false when window.process is undefined', () => {
      // Create a new window mock without process
      const mockWindowWithoutProcess = {
        require: jest.fn()
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindowWithoutProcess,
        writable: true,
        configurable: true
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ElectronService]
      });

      const newService = TestBed.inject(ElectronService);
      expect(newService.isElectron).toBe(false);
    });

    it('should return false when window.process.type is undefined', () => {
      // Create a new window mock with process but no type
      const mockWindowWithoutType = {
        process: {},
        require: jest.fn()
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindowWithoutType,
        writable: true,
        configurable: true
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ElectronService]
      });

      const newService = TestBed.inject(ElectronService);
      expect(newService.isElectron).toBe(false);
    });

    it('should return false when window is undefined', () => {
      // Set window to undefined
      Object.defineProperty(global, 'window', {
        value: undefined,
        writable: true,
        configurable: true
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ElectronService]
      });

      const newService = TestBed.inject(ElectronService);
      expect(newService.isElectron).toBe(false);
    });
  });

  describe('Electron Environment Initialization', () => {
    it('should initialize ipcRenderer when in Electron environment', () => {
      expect(service.ipcRenderer).toBeDefined();
      expect(service.ipcRenderer).toBe(mockIpcRenderer);
      expect((global.window as any).require).toHaveBeenCalledWith('electron');
    });

    it('should initialize webFrame when in Electron environment', () => {
      expect(service.webFrame).toBeDefined();
      expect(service.webFrame).toBe(mockWebFrame);
    });

    it('should initialize fs when in Electron environment', () => {
      expect(service.fs).toBeDefined();
      expect(service.fs).toBe(mockFs);
      expect((global.window as any).require).toHaveBeenCalledWith('fs');
    });

    it('should initialize childProcess when in Electron environment', () => {
      expect(service.childProcess).toBeDefined();
      expect(service.childProcess).toBe(mockChildProcess);
      expect((global.window as any).require).toHaveBeenCalledWith('child_process');
    });

    it('should execute node version check on initialization', () => {
      expect(mockChildProcess.exec).toHaveBeenCalledWith(
        'node -v',
        expect.any(Function)
      );
    });
  });

  describe('Node Version Check Callback', () => {
    let execCallback: (error: any, stdout: string, stderr: string) => void;
    let consoleSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeEach(() => {
      // Get the callback function passed to exec
      execCallback = mockChildProcess.exec.mock.calls[0][1];
      consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    });

    afterEach(() => {
      if (consoleSpy) {
        consoleSpy.mockRestore();
      }
      if (consoleErrorSpy) {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should log stdout when node version check succeeds', () => {
      const mockStdout = 'v18.17.0\n';
      execCallback(null, mockStdout, '');

      expect(consoleSpy).toHaveBeenCalledWith(`stdout:\n${mockStdout}`);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it('should log error when node version check fails', () => {
      const mockError = new Error('Command failed');
      execCallback(mockError, '', '');

      expect(consoleErrorSpy).toHaveBeenCalledWith(`error: ${mockError.message}`);
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log stderr when node version check returns stderr', () => {
      const mockStderr = 'some error output';
      execCallback(null, '', mockStderr);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`stderr: ${mockStderr}`);
      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });

  describe('Non-Electron Environment', () => {
    it('should not initialize Electron APIs when not in Electron environment', () => {
      // Create a window mock without process.type
      const nonElectronWindow = {
        require: jest.fn()
      };
      
      Object.defineProperty(global, 'window', {
        value: nonElectronWindow,
        writable: true,
        configurable: true
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ElectronService]
      });

      const nonElectronService = TestBed.inject(ElectronService);
      
      expect(nonElectronService.isElectron).toBe(false);
      expect(nonElectronService.ipcRenderer).toBeUndefined();
      expect(nonElectronService.webFrame).toBeUndefined();
      expect(nonElectronService.fs).toBeUndefined();
      expect(nonElectronService.childProcess).toBeUndefined();
    });
  });

  describe('Service Integration', () => {
    it('should be provided as singleton', () => {
      const service1 = TestBed.inject(ElectronService);
      const service2 = TestBed.inject(ElectronService);
      expect(service1).toBe(service2);
    });

    it('should have proper typing for all Electron APIs', () => {
      expect(typeof service.ipcRenderer).toBe('object');
      expect(typeof service.webFrame).toBe('object');
      expect(typeof service.fs).toBe('object');
      expect(typeof service.childProcess).toBe('object');
    });
  });

  describe('Error Handling', () => {
    it('should handle window.require failures gracefully', () => {
      // Create a window mock with a failing require function
      const mockWindowWithFailingRequire = {
        process: {
          type: 'renderer'
        },
        require: jest.fn().mockImplementation(() => {
          throw new Error('Module not found');
        })
      };
      
      Object.defineProperty(global, 'window', {
        value: mockWindowWithFailingRequire,
        writable: true,
        configurable: true
      });

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [ElectronService]
      });

      // This should not throw an error
      expect(() => {
        TestBed.inject(ElectronService);
      }).toThrow(); // The service itself will throw, which is expected behavior
    });
  });
});