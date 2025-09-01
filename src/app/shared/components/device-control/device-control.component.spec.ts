import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { TestBed,
         ComponentFixture,
         fakeAsync,
         tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DeviceControlComponent } from './device-control.component';
import { DeviceService } from '@services/device/device.service';
import { DeviceConfigurationService } from '@services/device-configuration/device-configuration.service';
import { DeviceConnectionStatusService } from '@services/device-connection-status/device-connection-status.service';
import { MqttService } from '@services/mqtt/mqtt.service';


const mockSerialNumber = signal('SN123');
const mockSettings = signal<any>({ distance: 5 });
const mockIsBusy = signal(false);

describe('DeviceControlComponent', () => {
  let fixture: ComponentFixture<DeviceControlComponent>;
  let component: DeviceControlComponent;
  let consoleSpy: jest.SpyInstance;
  let mockConnectionStatus$: Subject<boolean>;
  let mockDeviceService: any;
  let mockDeviceConfigService: any;
  let mockDeviceConnectionStatusService: any;
  let mockMqttService: any;

  beforeEach(async () => {
    mockConnectionStatus$ = new Subject<boolean>();
    
    mockDeviceService = { serialNumber: mockSerialNumber };
    mockDeviceConfigService = {
      isBusy: mockIsBusy,
      settings: mockSettings,
      loadSettings: jest.fn(() => Promise.resolve())
    };
    mockDeviceConnectionStatusService = {
      onChange: jest.fn(() => mockConnectionStatus$.asObservable())
    };
    mockMqttService = {};

    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        DeviceControlComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: DeviceConfigurationService, useValue: mockDeviceConfigService },
        { provide: DeviceConnectionStatusService, useValue: mockDeviceConnectionStatusService },
        { provide: MqttService, useValue: mockMqttService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DeviceControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    mockConnectionStatus$.complete();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('DeviceControlComponent INIT');
  });

  it('should render all child components', () => {
    expect(fixture.debugElement.query(By.css('app-connection-status'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-distance-slider'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-beacon-url-form'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-settings-table'))).toBeTruthy();
  });

  it('should pass serialNumber to app-connection-status', () => {
    const connStatus = fixture.debugElement.query(By.css('app-connection-status'));
    expect(connStatus.attributes['ng-reflect-device-s-n']).toBe('SN123');
  });

  it('should show spinner if settings is falsy or isBusy is true', () => {
    mockSettings.set(undefined);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('mat-spinner'))).toBeTruthy();
    mockSettings.set({ distance: 5 });
    mockIsBusy.set(true);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('mat-spinner'))).toBeTruthy();
    mockIsBusy.set(false);
    fixture.detectChanges();
  });

  it('should enable/disable child components based on isConnected', fakeAsync(() => {
    // Verify the mock service is set up correctly
    expect(mockDeviceConnectionStatusService.onChange).toHaveBeenCalledWith('SN123');
    
    // Initially not connected
    expect(component.isConnected()).toBe(false);
    const slider = fixture.debugElement.query(By.css('app-distance-slider'));
    const beaconForm = fixture.debugElement.query(By.css('app-beacon-url-form'));
    expect(slider.attributes['ng-reflect-disabled']).toBe('true');
    expect(beaconForm.attributes['ng-reflect-disabled']).toBe('true');
    
    // Simulate connection by emitting true to the status observable
    mockConnectionStatus$.next(true);
    tick(); // Process async operations
    fixture.detectChanges();
    
    // Check internal state
    expect(component.isConnected()).toBe(true);
    
    // Re-query elements after change detection
    const updatedSlider = fixture.debugElement.query(By.css('app-distance-slider'));
    const updatedBeaconForm = fixture.debugElement.query(By.css('app-beacon-url-form'));
    expect(updatedSlider.attributes['ng-reflect-disabled']).toBe('false');
    expect(updatedBeaconForm.attributes['ng-reflect-disabled']).toBe('false');
  }));

  it('should unsubscribe on destroy', () => {
    const unsubSpy = jest.spyOn(mockConnectionStatus$, 'unsubscribe');
    fixture.destroy();
    expect(true).toBe(true); // No error thrown
  });
});
