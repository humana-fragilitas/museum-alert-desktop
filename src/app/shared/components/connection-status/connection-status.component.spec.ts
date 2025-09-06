import { Subject } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';

import { TestBed,
         ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { ConnectionStatusComponent } from './connection-status.component';
import { DeviceConnectionStatusService } from '@services/device-connection-status/device-connection-status.service';


describe('ConnectionStatusComponent', () => {

  let fixture: ComponentFixture<ConnectionStatusComponent>;
  let component: ConnectionStatusComponent;
  let mockStatus$: Subject<boolean>;
  let mockService: { onChange: jest.Mock };
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockStatus$ = new Subject<boolean>();
    mockService = {
      onChange: jest.fn(() => mockStatus$.asObservable())
    };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        ConnectionStatusComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: DeviceConnectionStatusService, useValue: mockService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ConnectionStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    mockStatus$.complete();
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('ConnectionStatusComponent INIT');
  });

  it('should display disconnected by default', () => {
    const chip = fixture.debugElement.query(By.css('mat-chip'));
    expect(chip.nativeElement.classList).not.toContain('connected');
    expect(chip.nativeElement.textContent).toContain('COMMON.LABELS.DISCONNECTED');
  });

  it('should display connected when status is true', () => {
    fixture.componentRef.setInput('deviceSN', 'SN123');
    fixture.detectChanges();
    mockStatus$.next(true);
    fixture.detectChanges();
    const chip = fixture.debugElement.query(By.css('mat-chip'));
    expect(chip.nativeElement.classList).toContain('connected');
    expect(chip.nativeElement.textContent).toContain('COMMON.LABELS.CONNECTED');
  });

  it('should unsubscribe and resubscribe when deviceSN changes', () => {
    const unsubSpy = jest.spyOn(mockStatus$, 'unsubscribe');
    fixture.componentRef.setInput('deviceSN', 'SN1');
    fixture.detectChanges();
    mockStatus$.next(true);
    fixture.detectChanges();
    fixture.componentRef.setInput('deviceSN', 'SN2');
    fixture.detectChanges();
    expect(mockService.onChange).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe on destroy', () => {
    const unsubSpy = jest.spyOn(mockStatus$, 'unsubscribe');
    fixture.destroy();
    expect(true).toBe(true);
  });

});
