import { PortInfo } from '@serialport/bindings-cpp';

import { TestBed } from '@angular/core/testing';
import { NgZone,
         ApplicationRef } from '@angular/core';

import { DeviceService,
         USBCommandTimeoutException,
         USBCommandDeviceException } from './device.service';
import { WINDOW } from '@tokens/window';
import { APP_CONFIG } from '@env/environment';
import { DeviceEvent,
         DeviceMessageType,
         DeviceAppState,
         USBCommandType,
         DeviceIncomingData,
         WiFiNetwork } from '@shared-with-electron';


jest.mock('uuid', () => ({ v4: jest.fn(() => 'uuid') }));

const mockPortInfo: PortInfo = { path: '/dev/ttyUSB0', manufacturer: '', serialNumber: 'SN', vendorId: '', productId: '' } as PortInfo;
const mockWiFiNetworks: WiFiNetwork[] = [ { ssid: 'A', rssi: -50, encryptionType: 4 } ];

function createMockElectron() {
  return {
    ipcRenderer: {
      on: jest.fn(),
      send: jest.fn(),
      removeAllListeners: jest.fn()
    }
  };
}

describe('DeviceService', () => {
  let service: DeviceService;
  let mockWindow: any;
  let mockElectron: any;
  let ngZone: NgZone;
  let applicationRef: ApplicationRef;

  beforeEach(() => {
    mockElectron = createMockElectron();
    mockWindow = { electron: mockElectron };
    (APP_CONFIG as any).settings = { USB_RESPONSE_TIMEOUT: 1000 };
    TestBed.configureTestingModule({
      providers: [
        DeviceService,
        { provide: WINDOW, useValue: mockWindow }
      ]
    });
    service = TestBed.inject(DeviceService);
    ngZone = TestBed.inject(NgZone);
    applicationRef = TestBed.inject(ApplicationRef);
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('should be created and set up listeners', () => {
    expect(service).toBeTruthy();
    expect(mockElectron.ipcRenderer.on).toHaveBeenCalledWith(DeviceEvent.FOUND, expect.any(Function));
    expect(mockElectron.ipcRenderer.on).toHaveBeenCalledWith(DeviceEvent.CONNECTION_STATUS_UPDATE, expect.any(Function));
    expect(mockElectron.ipcRenderer.on).toHaveBeenCalledWith(DeviceEvent.INCOMING_DATA, expect.any(Function));
  });

  it('should update portInfo on FOUND event', () => {
    const handler = mockElectron.ipcRenderer.on.mock.calls.find((c: any) => c[0] === DeviceEvent.FOUND)[1];
    jest.spyOn(ngZone, 'run').mockImplementation(fn => fn());
    handler(mockPortInfo);
    expect(service.portInfo()).toEqual(mockPortInfo);
  });

  it('should update usbConnectionStatus on CONNECTION_STATUS_UPDATE event', () => {
    const handler = mockElectron.ipcRenderer.on.mock.calls.find((c: any) => c[0] === DeviceEvent.CONNECTION_STATUS_UPDATE)[1];
    jest.spyOn(ngZone, 'run').mockImplementation(fn => fn());
    handler(true);
    expect(service.usbConnectionStatus()).toBe(true);
  });

  it('should call parseIncomingData on INCOMING_DATA event', () => {
    const handler = mockElectron.ipcRenderer.on.mock.calls.find((c: any) => c[0] === DeviceEvent.INCOMING_DATA)[1];
    jest.spyOn(ngZone, 'run').mockImplementation(fn => fn());
    const spy = jest.spyOn(service, 'parseIncomingData');
    const data = { type: DeviceMessageType.APP_STATE as DeviceMessageType.APP_STATE, sn: 'SN', data: { appState: DeviceAppState.STARTED } } as DeviceIncomingData;
    handler(data);
    expect(spy).toHaveBeenCalledWith(data);
  });

  it('should set serial number if not set in parseIncomingData', () => {
    const data = { type: DeviceMessageType.APP_STATE as DeviceMessageType.APP_STATE, sn: 'SN', data: { appState: DeviceAppState.STARTED } } as DeviceIncomingData;
    service.parseIncomingData(data);
    expect(service.serialNumber()).toBe('SN');
  });

  it('should not overwrite serial number if already set', () => {
    service['serialNumberSignal'].set('EXISTING');
    const data = { type: DeviceMessageType.APP_STATE as DeviceMessageType.APP_STATE, sn: 'EXISTING', data: { appState: DeviceAppState.STARTED } } as DeviceIncomingData;
    service.parseIncomingData(data);
    expect(service.serialNumber()).toBe('EXISTING');
  });

  it('should set deviceAppStatus on APP_STATE', () => {
    const data = { type: DeviceMessageType.APP_STATE as DeviceMessageType.APP_STATE, sn: 'SN', data: { appState: DeviceAppState.CONNECT_TO_WIFI } } as DeviceIncomingData;
    service.parseIncomingData(data);
    expect(service.deviceAppStatus()).toBe(DeviceAppState.CONNECT_TO_WIFI);
  });

  it('should set wiFiNetworks on WIFI_NETWORKS_LIST', () => {
    const data = { type: DeviceMessageType.WIFI_NETWORKS_LIST as DeviceMessageType.WIFI_NETWORKS_LIST, sn: 'SN', data: mockWiFiNetworks } as DeviceIncomingData;
    service.parseIncomingData(data);
    expect(service.wiFiNetworks()).toEqual(mockWiFiNetworks);
  });

  it('should set error on ERROR message type', () => {
    const data = { type: DeviceMessageType.ERROR as DeviceMessageType.ERROR, sn: 'SN', data: { error: 1 } } as DeviceIncomingData;
    service.parseIncomingData(data);
    expect(service.error()).toEqual(data);
  });

  it('should call reset when usbConnectionStatus becomes false', async () => {
    const spy = jest.spyOn(service, 'reset');
    service['usbConnectionStatusSignal'].set(false);
    
    // Trigger effects
    applicationRef.tick();
    
    expect(spy).toHaveBeenCalled();
  });

  it('should reset all signals on reset()', () => {
    service['serialNumberSignal'].set('SN');
    service['portInfoSignal'].set(mockPortInfo);
    service['deviceAppStatusSignal'].set(DeviceAppState.CONNECT_TO_WIFI);
    service['wiFiNetworksSignal'].set(mockWiFiNetworks);
    service['errorSignal'].set({} as any);
    service['alarmSignal'].set({} as any);
    service['configurationSignal'].set({} as any);
    service.reset();
    expect(service.serialNumber()).toBe('');
    expect(service.portInfo()).toBeNull();
    expect(service.deviceAppStatus()).toBe(DeviceAppState.STARTED);
    expect(service.wiFiNetworks()).toEqual([]);
    expect(service.error()).toBeNull();
    expect(service.alarm()).toBeNull();
    expect(service.currentConfiguration()).toBeNull();
  });

  it('should generate correlation id with serial number', () => {
    service['serialNumberSignal'].set('SN');
    const cid = service.generateCid();
    expect(cid).toMatch(/^SN-uuid-\d+$/);
  });

  it('should generate correlation id with empty serial number', () => {
    service['serialNumberSignal'].set('');
    const cid = service.generateCid();
    expect(cid).toMatch(/^\-uuid-\d+$/);
  });

  it('should set alarm and configuration', () => {
    service.onAlarm({} as any);
    expect(service.alarm()).toEqual({});
    service.onConfiguration({} as any);
    expect(service.currentConfiguration()).toEqual({});
  });

  it('should get serial number and app status', () => {
    service['serialNumberSignal'].set('SN');
    service['deviceAppStatusSignal'].set(DeviceAppState.CONNECT_TO_WIFI);
    expect(service.getSerialNumber()).toBe('SN');
    expect(service.getAppStatus()).toBe(DeviceAppState.CONNECT_TO_WIFI);
  });

  it('should handle sendUSBCommand and resolve on response', async () => {
    service['serialNumberSignal'].set('SN');
    const sendSpy = jest.spyOn(mockWindow.electron.ipcRenderer, 'send');
    const promise = service.sendUSBCommand(USBCommandType.HARD_RESET, {} as any);
    // Simulate response
    const cid = Object.keys(service['pendingRequests'])[0];
    service.parseIncomingData({ type: DeviceMessageType.ACKNOWLEDGMENT, sn: 'SN', cid } as any);
    await expect(promise).resolves.toBeDefined();
    expect(sendSpy).toHaveBeenCalled();
  });

  it('should reject sendUSBCommand on timeout', async () => {
    service['serialNumberSignal'].set('SN');
    const promise = service.sendUSBCommand(USBCommandType.HARD_RESET, {} as any);
    jest.advanceTimersByTime(1001);
    await expect(promise).rejects.toThrow(USBCommandTimeoutException);
  });

  it('should reject sendUSBCommand on device error', async () => {
    service['serialNumberSignal'].set('SN');
    const promise = service.sendUSBCommand(USBCommandType.HARD_RESET, {} as any);
    const cid = Object.keys(service['pendingRequests'])[0];
    service.parseIncomingData({ type: DeviceMessageType.ERROR, sn: 'SN', cid, data: { error: 1 } } as any);
    await expect(promise).rejects.toThrow(USBCommandDeviceException);
  });
});