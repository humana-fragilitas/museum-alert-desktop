import { Subject } from 'rxjs';

import { TestBed,
         fakeAsync,
         tick } from '@angular/core/testing';
import { signal,
         ApplicationRef } from '@angular/core';

import { DeviceConnectionStatusService } from './device-connection-status.service';
import { MqttService } from '@services/mqtt/mqtt.service';
import { DeviceService } from '@services/device/device.service';
import { MqttMessageType,
         BaseMqttMessage,
         ConnectionStatus } from '@models';
import { DeviceErrorType } from '@shared-with-electron';


describe('DeviceConnectionStatusService', () => {

  let service: DeviceConnectionStatusService;
  let mqttServiceMock: { onMessageOfType: jest.Mock };
  let deviceServiceMock: { error: any };
  let mqttSubject: Subject<BaseMqttMessage<any>>;
  let errorSignal: any;
  let applicationRef: ApplicationRef;

  const sn = 'SN123';

  beforeEach(() => {
    mqttSubject = new Subject();
    errorSignal = signal<any>(null);
    mqttServiceMock = { onMessageOfType: jest.fn(() => mqttSubject) };
    deviceServiceMock = { error: errorSignal };
    TestBed.configureTestingModule({
      providers: [
        DeviceConnectionStatusService,
        { provide: MqttService, useValue: mqttServiceMock },
        { provide: DeviceService, useValue: deviceServiceMock }
      ]
    });
    service = TestBed.inject(DeviceConnectionStatusService);
    applicationRef = TestBed.inject(ApplicationRef);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update connection status on CONNECTION_STATUS message', fakeAsync(() => {
    const statusMsg: BaseMqttMessage<ConnectionStatus> = {
      type: MqttMessageType.CONNECTION_STATUS,
      sn,
      data: { connected: true },
      timestamp: Date.now()
    };
    let emitted = false;
    
    service.onChange(sn).subscribe(val => {
      if (val && !emitted) {
        emitted = true;
      }
    });
    
    applicationRef.tick();
    tick();
    
    mqttSubject.next(statusMsg);
    
    applicationRef.tick();
    tick();
    
    expect(emitted).toBe(true);
  }));

  it('should set connection status to true for other MQTT message types', fakeAsync(() => {
    const types = [MqttMessageType.ALARM, MqttMessageType.CONFIGURATION, MqttMessageType.ACKNOWLEGDE];
    let values: boolean[] = [];
    
    service.onChange(sn).subscribe(val => {
      values.push(val);
    });
    
    applicationRef.tick();
    tick();
    
    errorSignal.set({ sn, data: { error: DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT } });
    applicationRef.tick();
    tick();
    
    types.forEach(type => {
      errorSignal.set({ sn, data: { error: DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT } });
      applicationRef.tick();
      tick();
      
      mqttSubject.next({ type, sn, data: {}, timestamp: Date.now() });
      applicationRef.tick();
      tick();
    });
    
    const trueCount = values.filter(val => val === true).length;
    expect(trueCount).toBe(types.length);
  }));

  it('should set connection status to false on FAILED_SENSOR_DETECTION_REPORT error', fakeAsync(() => {
    let emitted = false;
    
    service.onChange(sn).subscribe(val => {
      if (val === false && !emitted) {
        emitted = true;
      }
    });
    
    applicationRef.tick();
    tick();
    
    errorSignal.set({ sn, data: { error: DeviceErrorType.FAILED_SENSOR_DETECTION_REPORT } });
    
    applicationRef.tick();
    tick();
    
    expect(emitted).toBe(true);
  }));

  it('getConnectionStatus should return computed signal', () => {
    const status = service.getConnectionStatus(sn);
    expect(typeof status()).toBe('boolean');
  });

});
