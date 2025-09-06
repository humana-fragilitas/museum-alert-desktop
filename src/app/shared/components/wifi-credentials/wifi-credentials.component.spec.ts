import { TranslateModule } from '@ngx-translate/core';

import { TestBed,
         ComponentFixture,
         fakeAsync,
         tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import { DeviceService } from '@services/device/device.service';
import { ErrorService } from '@services/error/error.service';
import { WiFiCredentialsComponent } from './wifi-credentials.component';


const mockWiFiNetworksSignal = signal<any[]>([]);
const mockErrorSignal = signal<string | null>(null);
const mockAppStatusSignal = signal(2); // DeviceAppState.CONFIGURE_WIFI

const mockDeviceService = {
  wiFiNetworks: mockWiFiNetworksSignal,
  error: mockErrorSignal,
  deviceAppStatus: mockAppStatusSignal,
  sendUSBCommand: jest.fn(() => Promise.resolve({}))
};
const mockSnackBar = { open: jest.fn() };
const mockErrorService = { toTranslationTag: jest.fn(() => 'ERRORS.APPLICATION.WIFI_CREDENTIALS_COMMAND_TIMED_OUT') };

describe('WiFiCredentialsComponent', () => {
  
  let fixture: ComponentFixture<WiFiCredentialsComponent>;
  let component: WiFiCredentialsComponent;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        WiFiCredentialsComponent,
        TranslateModule.forRoot(),
        NoopAnimationsModule
      ],
      providers: [
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: ErrorService, useValue: mockErrorService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(WiFiCredentialsComponent);
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
    expect(consoleSpy).toHaveBeenCalledWith('[WiFiCredentialsComponent]: ngOnInit');
  });

  it('should render form and disable controls when no networks', () => {
    mockWiFiNetworksSignal.set([]);
    fixture.detectChanges();
    const ssid = component.credentialsForm.get('ssid');
    const pwd = component.credentialsForm.get('password');
    expect(ssid?.disabled).toBe(true);
    expect(pwd?.disabled).toBe(true);
  });

  it('should enable controls when networks are available and not busy', () => {
    mockWiFiNetworksSignal.set([{ ssid: 'TestNet', rssi: -50, encryptionType: 1 }]);
    component.isSendingCredentials.set(false);
    component.isRefreshingWiFiNetworks.set(false);
    fixture.detectChanges();
    const ssid = component.credentialsForm.get('ssid');
    const pwd = component.credentialsForm.get('password');
    expect(ssid?.enabled).toBe(true);
    expect(pwd?.enabled).toBe(true);
  });

  it('should show spinner and disable submit when busy', () => {
    component.isSendingCredentials.set(true);
    fixture.detectChanges();
    const spinner = fixture.debugElement.query(By.css('mat-progress-spinner'));
    expect(spinner).toBeTruthy();
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.disabled).toBe(true);
  });

  it('should call sendUSBCommand and set isSendingCredentials on submit (success)', fakeAsync(() => {
    mockWiFiNetworksSignal.set([{ ssid: 'TestNet', rssi: -50, encryptionType: 1 }]);
    component.credentialsForm.get('ssid')?.setValue('TestNet');
    component.credentialsForm.get('password')?.setValue('pw');
    component.isSendingCredentials.set(false);
    fixture.detectChanges();
    
    component.onSubmit();
    expect(component.isSendingCredentials()).toBe(true)
    
    tick();
    expect(mockDeviceService.sendUSBCommand).toHaveBeenCalled();
  }));

  it('should show snackbar and reset isSendingCredentials on submit error', async () => {
    (component as any).snackBar = mockSnackBar;
    mockDeviceService.sendUSBCommand.mockRejectedValueOnce({ data: { error: 'fail' } });
    mockWiFiNetworksSignal.set([{ ssid: 'TestNet', rssi: -50, encryptionType: 1 }]);
    component.credentialsForm.get('ssid')?.setValue('TestNet');
    component.credentialsForm.get('password')?.setValue('pw');
    component.isSendingCredentials.set(false);
    fixture.detectChanges();
    
    await component.onSubmit();
    
    expect(mockErrorService.toTranslationTag).toHaveBeenCalledWith('fail');
    expect(mockSnackBar.open).toHaveBeenCalled();
    expect(component.isSendingCredentials()).toBe(false);
  });

  it('should call sendUSBCommand and reset isRefreshingWiFiNetworks on refresh', async () => {
    mockDeviceService.sendUSBCommand.mockResolvedValueOnce({});
    component.isRefreshingWiFiNetworks.set(false);
    fixture.detectChanges();
    
    await component.refreshWiFiNetworks();
    
    expect(mockDeviceService.sendUSBCommand).toHaveBeenCalled();
    expect(component.isRefreshingWiFiNetworks()).toBe(false);
  });

  it('should show snackbar on refresh error', async () => {
    (component as any).snackBar = mockSnackBar;
    mockDeviceService.sendUSBCommand.mockRejectedValueOnce(new Error('fail'));
    component.isRefreshingWiFiNetworks.set(false);
    fixture.detectChanges();
    
    await component.refreshWiFiNetworks();
    
    expect(mockSnackBar.open).toHaveBeenCalled();
    expect(component.isRefreshingWiFiNetworks()).toBe(false);
  });

  it('should reset isSendingCredentials on device error signal only when sending credentials', () => {
    component.isSendingCredentials.set(true);
    mockErrorSignal.set('Some error');
    fixture.detectChanges();
    expect(component.isSendingCredentials()).toBe(false);
    
    component.isSendingCredentials.set(false);
    mockErrorSignal.set('Another error');
    fixture.detectChanges();
    expect(component.isSendingCredentials()).toBe(false);
  });

  it('should not reset isSendingCredentials when error signal is cleared', () => {
    mockWiFiNetworksSignal.set([{ ssid: 'TestNet', rssi: -50, encryptionType: 1 }]);
    mockErrorSignal.set(null);
    component.isRefreshingWiFiNetworks.set(false);
    fixture.detectChanges();
    
    component.isSendingCredentials.set(true);
    fixture.detectChanges();
    
    mockErrorSignal.set(null);
    fixture.detectChanges();
    
    expect(component.isSendingCredentials()).toBe(true);
  });

});
