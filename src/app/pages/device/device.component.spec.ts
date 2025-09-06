import { TranslateService,
         TranslateStore,
         TranslateModule } from '@ngx-translate/core';


import { ComponentFixture,
         TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { DeviceComponent } from './device.component';


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
        TranslateStore,
        { provide: MatSnackBar, useValue: { open: jest.fn() } },
        provideHttpClient(),
        provideHttpClientTesting()
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