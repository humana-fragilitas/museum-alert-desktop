import { TestBed } from '@angular/core/testing';

import { ElectronService } from './electron.service';


describe('ElectronService', () => {
  let service: ElectronService;
  let mockIpcRenderer: any;
  let mockWebFrame: any;
  let mockChildProcess: any;
  let mockFs: any;
  let originalWindow: any;

  beforeAll(() => {
    originalWindow = global.window;
  });

  afterAll(() => {
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true,
      configurable: true
    });
  });

  function setupElectronWindow() {
    mockIpcRenderer = { on: jest.fn(), send: jest.fn(), invoke: jest.fn(), removeAllListeners: jest.fn() };
    mockWebFrame = { setZoomFactor: jest.fn(), getZoomFactor: jest.fn() };
    mockChildProcess = { exec: jest.fn() };
    mockFs = { readFile: jest.fn(), writeFile: jest.fn(), existsSync: jest.fn() };
    const mockWindow = {
      process: { type: 'renderer' },
      require: jest.fn().mockImplementation((module: string) => {
        switch (module) {
          case 'electron': return { ipcRenderer: mockIpcRenderer, webFrame: mockWebFrame };
          case 'fs': return mockFs;
          case 'child_process': return mockChildProcess;
          default: return {};
        }
      })
    };
    Object.defineProperty(global, 'window', { value: mockWindow, writable: true, configurable: true });
  }

  it('should be created and initialize Electron APIs in Electron environment', () => {
    setupElectronWindow();
    TestBed.configureTestingModule({ providers: [ElectronService] });
    service = TestBed.inject(ElectronService);
    expect(service).toBeTruthy();
    expect(service.isElectron).toBe(true);
    expect(service.ipcRenderer).toBe(mockIpcRenderer);
    expect(service.webFrame).toBe(mockWebFrame);
    expect(service.fs).toBe(mockFs);
    expect(service.childProcess).toBe(mockChildProcess);
    expect((global.window as any).require).toHaveBeenCalledWith('electron');
    expect((global.window as any).require).toHaveBeenCalledWith('fs');
    expect((global.window as any).require).toHaveBeenCalledWith('child_process');
  });

  it('should execute node version check and log stdout', () => {
    setupElectronWindow();
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    TestBed.configureTestingModule({ providers: [ElectronService] });
    service = TestBed.inject(ElectronService);
    // Simulate exec callback
    const cb = mockChildProcess.exec.mock.calls[0][1];
    cb(null, 'v20.0.0\n', '');
    expect(logSpy).toHaveBeenCalledWith('[ElectronService]: stdout:\nv20.0.0\n');
    logSpy.mockRestore();
  });

  it('should log error if node version check fails', () => {
    setupElectronWindow();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    TestBed.configureTestingModule({ providers: [ElectronService] });
    service = TestBed.inject(ElectronService);
    const cb = mockChildProcess.exec.mock.calls[0][1];
    cb(new Error('fail'), '', '');
    expect(errorSpy).toHaveBeenCalledWith('[ElectronService]: error: fail');
    errorSpy.mockRestore();
  });

  it('should log stderr if node version check returns stderr', () => {
    setupElectronWindow();
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    TestBed.configureTestingModule({ providers: [ElectronService] });
    service = TestBed.inject(ElectronService);
    const cb = mockChildProcess.exec.mock.calls[0][1];
    cb(null, '', 'some stderr');
    expect(errorSpy).toHaveBeenCalledWith('[ElectronService]: stderr: some stderr');
    errorSpy.mockRestore();
  });

  it('should not initialize Electron APIs in non-Electron environment', () => {
    const nonElectronWindow = { require: jest.fn() };
    Object.defineProperty(global, 'window', { value: nonElectronWindow, writable: true, configurable: true });
    TestBed.configureTestingModule({ providers: [ElectronService] });
    service = TestBed.inject(ElectronService);
    expect(service.isElectron).toBe(false);
    expect(service.ipcRenderer).toBeUndefined();
    expect(service.webFrame).toBeUndefined();
    expect(service.fs).toBeUndefined();
    expect(service.childProcess).toBeUndefined();
  });

  it('should return false for isElectron if window/process/type are missing', () => {
    Object.defineProperty(global, 'window', { value: {}, writable: true, configurable: true });
    TestBed.configureTestingModule({ providers: [ElectronService] });
    service = TestBed.inject(ElectronService);
    expect(service.isElectron).toBe(false);
    Object.defineProperty(global, 'window', { value: { process: {} }, writable: true, configurable: true });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ElectronService] });
    service = TestBed.inject(ElectronService);
    expect(service.isElectron).toBe(false);
    Object.defineProperty(global, 'window', { value: undefined, writable: true, configurable: true });
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ElectronService] });
    service = TestBed.inject(ElectronService);
    expect(service.isElectron).toBe(false);
  });

  it('should be a singleton service', () => {
    setupElectronWindow();
    TestBed.configureTestingModule({ providers: [ElectronService] });
    const s1 = TestBed.inject(ElectronService);
    const s2 = TestBed.inject(ElectronService);
    expect(s1).toBe(s2);
  });

  it('should throw if window.require throws', () => {
    const mockWindow = {
      process: { type: 'renderer' },
      require: jest.fn().mockImplementation(() => { throw new Error('fail'); })
    };
    Object.defineProperty(global, 'window', { value: mockWindow, writable: true, configurable: true });
    TestBed.configureTestingModule({ providers: [ElectronService] });
    expect(() => TestBed.inject(ElectronService)).toThrow();
  });
});