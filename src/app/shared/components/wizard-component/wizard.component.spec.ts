import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { WizardComponent } from './wizard.component';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { DeviceService } from '@services/device/device.service';
import { ErrorService } from '@services/error/error.service';
import { DeviceAppState, USBCommandType } from '@shared-with-electron';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

describe('WizardComponent', () => {
  let fixture: ComponentFixture<WizardComponent>;
  let component: WizardComponent;
  let mockDeviceService: any;
  let mockSnackBar: any;
  let mockErrorService: any;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockDeviceService = {
      usbConnectionStatus: signal(true),
      deviceAppStatus: signal(DeviceAppState.CONFIGURE_WIFI),
      wiFiNetworks: signal([]),
      error: signal(null),
      serialNumber: signal('TEST123'),
      currentConfiguration: signal(null),
      portInfo: signal(null),
      alarm: signal(null),
      sendUSBCommand: jest.fn(() => Promise.resolve())
    };
    mockSnackBar = { open: jest.fn() };
    mockErrorService = { toTranslationTag: jest.fn(() => 'ERRORS.APPLICATION.WIFI_CREDENTIALS_COMMAND_TIMED_OUT') };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        WizardComponent,
        TranslateModule.forRoot(),
        HttpClientTestingModule
      ],
      providers: [
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: MatSnackBar, useValue: mockSnackBar },
        { provide: ErrorService, useValue: mockErrorService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(WizardComponent);
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
    expect(consoleSpy).toHaveBeenCalledWith('WizardComponent INIT');
  });

  it('should render stepper when visible and ready', () => {
    mockDeviceService.usbConnectionStatus.set(true);
    mockDeviceService.deviceAppStatus.set(DeviceAppState.CONFIGURE_WIFI);
    fixture.detectChanges();
    const stepper = fixture.debugElement.query(By.css('mat-stepper'));
    expect(stepper).toBeTruthy();
  });

  it('should render wait message when not ready and not fatal', () => {
    mockDeviceService.usbConnectionStatus.set(true);
    mockDeviceService.deviceAppStatus.set(DeviceAppState.STARTED);
    fixture.detectChanges();
    const waitMsg = fixture.debugElement.query(By.css('.wait-message'));
    expect(waitMsg.nativeElement.textContent).toContain('COMPONENTS.WIZARD.WAIT_FOR_COMMUNICATION_MESSAGE');
  });

  it('should render fatal error and reset button', () => {
    mockDeviceService.usbConnectionStatus.set(true);
    mockDeviceService.deviceAppStatus.set(DeviceAppState.FATAL_ERROR);
    fixture.detectChanges();
    const errorMsg = fixture.debugElement.query(By.css('.error-message'));
    expect(errorMsg.nativeElement.textContent).toContain('COMPONENTS.WIZARD.FATAL_ERROR_MESSAGE');
    const resetBtn = fixture.debugElement.query(By.css('.reset-button'));
    expect(resetBtn).toBeTruthy();
  });

  it('should call sendUSBCommand on reset', fakeAsync(() => {
    mockDeviceService.usbConnectionStatus.set(true);
    mockDeviceService.deviceAppStatus.set(DeviceAppState.FATAL_ERROR);
    fixture.detectChanges();
    const resetBtn = fixture.debugElement.query(By.css('.reset-button'));
    resetBtn.nativeElement.click();
    tick();
    expect(mockDeviceService.sendUSBCommand).toHaveBeenCalledWith(USBCommandType.HARD_RESET, null);
  }));

  it('should set correct stepper state for each app state', fakeAsync(() => {
    mockDeviceService.usbConnectionStatus.set(true);
    const stateStepMap = [
      [DeviceAppState.CONFIGURE_WIFI, 0],
      [DeviceAppState.CONFIGURE_CERTIFICATES, 1],
      [DeviceAppState.PROVISION_DEVICE, 2],
      [DeviceAppState.DEVICE_INITIALIZED, 3]
    ];
    for (const [state, idx] of stateStepMap) {
      mockDeviceService.deviceAppStatus.set(state);
      fixture.detectChanges();
      tick();
      const stepper = fixture.debugElement.query(By.css('mat-stepper'));
      if (stepper && stepper.componentInstance) {
        expect(stepper.componentInstance.selectedIndex).toBe(idx);
      }
    }
  }));
});
