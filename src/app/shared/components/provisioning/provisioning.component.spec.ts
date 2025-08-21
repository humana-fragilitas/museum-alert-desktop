import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { ProvisioningComponent } from './provisioning.component';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';
import { DialogType } from '@models';
import { ProvisioningService } from '@services/provisioning/provisioning.service';
import { DeviceService } from '@services/device/device.service';
import { AuthService } from '@services/auth/auth.service';
import { DeviceRegistryService } from '@services/device-registry/device-registry.service';
import { DialogService } from '@services/dialog/dialog.service';
import { CompanyService } from '@services/company/company.service';
import { ErrorService } from '@services/error/error.service';

const mockCompanySignal = signal<any>({ companyName: 'TestOrg' });

const mockAuthService = { idToken: jest.fn(() => 'id-token') };
const mockProvisioningService = { createClaim: jest.fn(() => of({ data: { certificatePem: 'cert', keyPair: { PrivateKey: 'priv' } } })) };
const mockDeviceService = {
  serialNumber: jest.fn(() => 'SN123'),
  sendUSBCommand: jest.fn(() => Promise.resolve({})),
};
const mockDialogService = { openDialog: jest.fn() };
const mockDeviceRegistryService = { checkSensorExists: jest.fn(() => of(null)) };
const mockCompanyService = { organization: mockCompanySignal };
const mockErrorService = { showModal: jest.fn() };

describe('ProvisioningComponent', () => {
  let fixture: ComponentFixture<ProvisioningComponent>;
  let component: ProvisioningComponent;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        ProvisioningComponent,
        HttpClientTestingModule,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProvisioningService, useValue: mockProvisioningService },
        { provide: DeviceService, useValue: mockDeviceService },
        { provide: DialogService, useValue: mockDialogService },
        { provide: DeviceRegistryService, useValue: mockDeviceRegistryService },
        { provide: CompanyService, useValue: mockCompanyService },
        { provide: ErrorService, useValue: mockErrorService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ProvisioningComponent);
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
    expect(consoleSpy).toHaveBeenCalledWith('ProvisioningComponent INIT');
  });

  it('should render explanatory message with company', () => {
    const h3 = fixture.debugElement.query(By.css('h3'));
    expect(h3.nativeElement.textContent).toContain('COMPONENTS.PROVISIONING.EXPLANATORY_MESSAGE_WITH_COMPANY');
  });

  it('should render explanatory message without company', () => {
    mockCompanySignal.set({});
    fixture.detectChanges();
    const h3 = fixture.debugElement.query(By.css('h3'));
    expect(h3.nativeElement.textContent).toContain('COMPONENTS.PROVISIONING.EXPLANATORY_MESSAGE_WITH_NO_COMPANY');
  });

  it('should disable button and show spinner when isBusy is true', () => {
    component.isBusy.set(true);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn.nativeElement.disabled).toBe(true);
    const spinner = fixture.debugElement.query(By.css('mat-progress-spinner'));
    expect(spinner).toBeTruthy();
  });

  it('should enable button and hide spinner when isBusy is false', () => {
    component.isBusy.set(false);
    fixture.detectChanges();
    const btn = fixture.debugElement.query(By.css('button'));
    expect(btn.nativeElement.disabled).toBe(false);
    const spinner = fixture.debugElement.query(By.css('mat-progress-spinner'));
    expect(spinner).toBeNull();
  });

  it('should provision device if sensor does not exist', fakeAsync(async () => {
    mockDeviceRegistryService.checkSensorExists.mockReturnValueOnce(of(null));
    mockProvisioningService.createClaim.mockReturnValueOnce(of({ data: { certificatePem: 'cert', keyPair: { PrivateKey: 'priv' } } }));
    mockDeviceService.sendUSBCommand.mockResolvedValueOnce({});
    await component.provisionDevice();
    expect(mockDeviceRegistryService.checkSensorExists).toHaveBeenCalled();
    expect(mockProvisioningService.createClaim).toHaveBeenCalled();
    expect(mockDeviceService.sendUSBCommand).toHaveBeenCalled();
    expect(component.isBusy()).toBe(false);
  }));

  it('should show warning dialog if sensor exists', fakeAsync(async () => {
    mockDeviceRegistryService.checkSensorExists.mockReturnValueOnce(of({ thingName: 'thing', company: true }) as any);
    await component.provisionDevice();
    expect(mockDialogService.openDialog).toHaveBeenCalledWith(expect.objectContaining({ type: DialogType.WARNING }));
    expect(component.isBusy()).toBe(false);
  }));

  it('should show error dialog on error', async () => {
    mockDeviceRegistryService.checkSensorExists.mockReturnValueOnce(throwError(() => new Error('fail')));
    
    await component.provisionDevice();
    
    expect(mockDialogService.openDialog).toHaveBeenCalledWith(expect.objectContaining({ 
      title: 'ERRORS.APPLICATION.PROVISIONING_FAILED_TITLE' 
    }));
    expect(component.isBusy()).toBe(false);
  });
});
