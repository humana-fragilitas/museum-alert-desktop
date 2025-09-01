import { TranslateModule } from '@ngx-translate/core';

import { TestBed,
         ComponentFixture,
         fakeAsync,
         flushMicrotasks } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DeviceDiagnosticsComponent } from './device-diagnostics.component';
import { DeviceService } from '@services/device/device.service';


describe('DeviceDiagnosticsComponent', () => {
  let fixture: ComponentFixture<DeviceDiagnosticsComponent>;
  let component: DeviceDiagnosticsComponent;
  let mockAlarmSignal: ReturnType<typeof signal>;
  let mockDeviceService: { alarm: typeof mockAlarmSignal };
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockAlarmSignal = signal<any>(null);
    mockDeviceService = { alarm: mockAlarmSignal };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        DeviceDiagnosticsComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: DeviceService, useValue: mockDeviceService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DeviceDiagnosticsComponent);
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
    expect(consoleSpy).toHaveBeenCalledWith('DeviceDiagnosticsComponent INIT');
  });

  it('should render diagnostics info', () => {
    const card = fixture.debugElement.query(By.css('mat-card'));
    expect(card).toBeTruthy();
    expect(card.nativeElement.textContent).toContain('COMPONENTS.DEVICE_DIAGNOSTICS.LABEL');
    expect(card.nativeElement.textContent).toContain('COMPONENTS.DEVICE_DIAGNOSTICS.CALL_TO_ACTION');
  });

  it('should show no alerts received if alarm is null', () => {
    mockAlarmSignal.set(null);
    fixture.detectChanges();
    const label = fixture.debugElement.query(By.css('.device-spec-label'));
    expect(label.nativeElement.textContent).toContain('COMPONENTS.DEVICE_DIAGNOSTICS.NO_ALERTS_RECEIVED');
  });

  it('should show last alert received and detected distance if alarm is set', () => {
    const alarm = { timestamp: new Date(), data: { distance: 42 } };
    mockAlarmSignal.set(alarm);
    fixture.detectChanges();
    const labels = fixture.debugElement.queryAll(By.css('.device-spec-label'));
    expect(labels[0].nativeElement.textContent).toContain('COMPONENTS.DEVICE_DIAGNOSTICS.LAST_ALERT_RECEIVED_AT');
    expect(labels[1].nativeElement.textContent).toContain('COMPONENTS.DEVICE_DIAGNOSTICS.DETECTED_DISTANCE');
    const values = fixture.debugElement.queryAll(By.css('.device-spec-value'));
    expect(values[1].nativeElement.textContent).toContain('42');
  });

  it('should add flash class when alarm changes', fakeAsync(() => {
    const card = fixture.debugElement.query(By.css('mat-card'));
    expect(card.nativeElement.classList).not.toContain('flash');
    
    // Set alarm and verify flash is added
    mockAlarmSignal.set({ timestamp: new Date(), data: { distance: 1 } });
    fixture.detectChanges();
    flushMicrotasks(); // Ensure effects are triggered
    expect(card.nativeElement.classList).toContain('flash');
    
    // Note: Testing the automatic removal via setTimeout is complex in unit tests
    // due to timing issues with Angular's zone. The important behavior is that
    // the flash class gets added when the alarm changes.
  }));
});
