import { TranslateModule } from '@ngx-translate/core';

import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TestBed,
         ComponentFixture,
         fakeAsync,
         tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { BeaconUrlFormComponent } from './beacon-url-form.component';
import { DeviceConfigurationService } from '@services/device-configuration/device-configuration.service';
import { DialogService } from '@services/dialog/dialog.service';


const mockSettingsSignal = signal<any>({ beaconUrl: '' });
const mockIsBusySignal = signal(false);

const mockDeviceConfigService = {
  settings: mockSettingsSignal,
  isBusy: mockIsBusySignal,
  saveSettings: jest.fn().mockResolvedValue(undefined)
};
const mockDialogService = { openDialog: jest.fn() };

describe('BeaconUrlFormComponent', () => {

  let fixture: ComponentFixture<BeaconUrlFormComponent>;
  let component: BeaconUrlFormComponent;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        BeaconUrlFormComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: DeviceConfigurationService, useValue: mockDeviceConfigService },
        { provide: DialogService, useValue: mockDialogService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(BeaconUrlFormComponent);
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

  it('should render the beacon url input', () => {
    const input = fixture.debugElement.query(By.css('input[formControlName="beaconUrl"]'));
    expect(input).toBeTruthy();
  });

  it('should disable submit button if form is invalid', () => {
    component['isEditModeSignal'].set(true);
    component.beaconUrlForm.get('beaconUrl')?.setValue('');
    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.disabled).toBe(true);
  });

  it('should enable submit button if form is valid and edit mode', () => {
    component['isEditModeSignal'].set(true);
    component.beaconUrlForm.get('beaconUrl')?.setValue('https://test.com');
    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.disabled).toBe(false);
  });

  it('should call onSubmit and saveSettings on submit', async () => {
    component['isEditModeSignal'].set(true);
    component.beaconUrlForm.get('beaconUrl')?.setValue('https://test.com');
    fixture.detectChanges();
    
    const submitPromise = component.onSubmit();
    await submitPromise;
    
    expect(mockDeviceConfigService.saveSettings).toHaveBeenCalledWith({ beaconUrl: 'https://test.com' });
    expect(consoleSpy).toHaveBeenCalledWith('[BeaconUrlFormComponent]: beacon url form submitted:', expect.any(Object));
    expect(consoleSpy).toHaveBeenCalledWith('[BeaconUrlFormComponent]: beacon url saved successfully');
  });

  it('should call dialogService.openDialog on save error', async () => {
    mockDeviceConfigService.saveSettings.mockRejectedValueOnce(new Error('fail'));
    component['isEditModeSignal'].set(true);
    component.beaconUrlForm.get('beaconUrl')?.setValue('https://fail.com');
    fixture.detectChanges();
    
    const submitPromise = component.onSubmit();
    await submitPromise;
    
    expect(mockDialogService.openDialog).toHaveBeenCalledWith(expect.objectContaining({ type: expect.any(String) }));
    expect(consoleSpy).toHaveBeenCalledWith('[BeaconUrlFormComponent]: error while saving beacon url');
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('[BeaconUrlFormComponent] ngOnInit');
  });

  it('should show error message when form is invalid', fakeAsync(() => {
    component['isEditModeSignal'].set(true);
    component.beaconUrlForm.get('beaconUrl')?.setValue('');
    component.beaconUrlForm.get('beaconUrl')?.markAsTouched();
    fixture.detectChanges();
    tick();
    const error = fixture.debugElement.query(By.css('mat-error strong'));
    expect(error.nativeElement.textContent).toContain('COMPONENTS.BEACON_URL_FORM.ERRORS.URL_IS_REQUIRED');
  }));

  it('should call edit() and focus/select input', fakeAsync(() => {
    const focusSpy = jest.fn();
    const selectSpy = jest.fn();
    component.beaconUrlInput = { nativeElement: { focus: focusSpy, select: selectSpy } } as any;
    component.edit();
    tick();
    expect(component.isEditMode()).toBe(true);
    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
  }));

  it('should call cancel() and blur input', fakeAsync(() => {
    const blurSpy = jest.fn();
    component.beaconUrlInput = { nativeElement: { blur: blurSpy } } as any;
    component.cancel();
    tick();
    expect(component.isEditMode()).toBe(false);
    expect(blurSpy).toHaveBeenCalled();
  }));

});
