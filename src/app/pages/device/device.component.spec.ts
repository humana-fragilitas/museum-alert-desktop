import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DeviceComponent } from './device.component';
import { DeviceStateComponent } from '@shared/components/device-state/device-state.component';
import { WizardComponent } from '@shared/components/wizard-component/wizard.component';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { By } from '@angular/platform-browser';
import { TranslateService, TranslateStore, TranslateModule } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

describe('DeviceComponent', () => {
  let fixture: ComponentFixture<DeviceComponent>;
  let component: DeviceComponent;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        DeviceComponent,
        TranslateModule.forRoot(),
        NoopAnimationsModule
      ],
      providers: [
        TranslateService,
        TranslateStore
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DeviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render app-device-state and app-wizard', () => {
    const deviceState = fixture.debugElement.query(By.css('app-device-state'));
    const wizard = fixture.debugElement.query(By.css('app-wizard'));
    expect(deviceState).toBeTruthy();
    expect(wizard).toBeTruthy();
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('[DeviceComponent] ngOnInit');
  });

  it('should expose DeviceAppState', () => {
    expect(component.deviceAppState).toBeDefined();
  });
});