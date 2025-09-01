import { TranslateModule } from '@ngx-translate/core';

import { TestBed,
         ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DeviceService } from '@services/device/device.service';
import { DeviceAppState } from '@shared-with-electron';
import { DeviceStateComponent } from './device-state.component';


describe('DeviceStateComponent', () => {
  let fixture: ComponentFixture<DeviceStateComponent>;
  let component: DeviceStateComponent;
  let mockDeviceService: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockDeviceService = {
      usbConnectionStatus: signal(true),
      deviceAppStatus: signal(DeviceAppState.CONNECT_TO_WIFI),
      portInfo: signal({
        path: '/dev/ttyUSB0',
        manufacturer: 'TestManu',
        productId: 'PID123'
      }),
      serialNumber: signal('SN123')
    };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        DeviceStateComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: DeviceService, useValue: mockDeviceService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DeviceStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('DeviceStateComponent INIT');
  });

  it('should render device info when connected', () => {
    const card = fixture.debugElement.query(By.css('mat-card'));
    expect(card).toBeTruthy();
    expect(card.nativeElement.textContent).toContain('COMPONENTS.DEVICE_STATE.LABEL');
    expect(card.nativeElement.textContent).toContain('/dev/ttyUSB0');
    expect(card.nativeElement.textContent).toContain('TestManu');
    expect(card.nativeElement.textContent).toContain('SN123');
    expect(card.nativeElement.textContent).toContain('PID123');
  });

  it('should render call-to-action when not connected', () => {
    mockDeviceService.usbConnectionStatus.set(false);
    fixture.detectChanges();
    const card = fixture.debugElement.query(By.css('mat-card'));
    expect(card.nativeElement.textContent).toContain('COMPONENTS.DEVICE_STATE.CALL_TO_ACTION');
  });

  it('should show spinner if serialNumber is falsy', () => {
    mockDeviceService.serialNumber.set(undefined);
    fixture.detectChanges();
    const spinner = fixture.debugElement.query(By.css('mat-spinner'));
    expect(spinner).toBeTruthy();
  });

  it('should render correct status label for each app state', () => {
    const statusMap = [
      [DeviceAppState.INITIALIZE_CIPHERING, 'COMPONENTS.DEVICE_STATE.CIPHERING_INITIALIZATION'],
      [DeviceAppState.CONFIGURE_WIFI, 'COMPONENTS.DEVICE_STATE.WAITING_FOR_WIFI'],
      [DeviceAppState.CONFIGURE_CERTIFICATES, 'COMPONENTS.DEVICE_STATE.WAITING_FOR_PROVISIONING_SETTINGS'],
      [DeviceAppState.CONNECT_TO_WIFI, 'COMPONENTS.DEVICE_STATE.CONNECTING_TO_WIFI'],
      [DeviceAppState.PROVISION_DEVICE, 'COMPONENTS.DEVICE_STATE.WAITING_FOR_TLS_SETTINGS'],
      [DeviceAppState.CONNECT_TO_MQTT_BROKER, 'COMPONENTS.DEVICE_STATE.CONNECTING_TO_MQTT_BROKER'],
      [DeviceAppState.DEVICE_INITIALIZED, 'COMPONENTS.DEVICE_STATE.INITIALIZED'],
      [999, 'COMPONENTS.DEVICE_STATE.IDLE'] // default
    ];
    for (const [state, label] of statusMap) {
      mockDeviceService.deviceAppStatus.set(state);
      fixture.detectChanges();
      const chip = fixture.debugElement.query(By.css('.device-status-label'));
      expect(chip.nativeElement.textContent).toContain(label);
    }
  });
});
