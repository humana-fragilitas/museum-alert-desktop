import { TranslateModule } from '@ngx-translate/core';

import { TestBed,
         ComponentFixture } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { SettingsTableComponent } from './settings-table.component';


describe('SettingsTableComponent', () => {
  let fixture: ComponentFixture<SettingsTableComponent>;
  let component: SettingsTableComponent;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        SettingsTableComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(SettingsTableComponent);
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
    expect(consoleSpy).toHaveBeenCalledWith('SettingsTableComponent INIT');
  });

  it('should render firmware and formatted distance when data is set', () => {
    fixture.componentRef.setInput('data', { firmware: 'FW1.2.3', distance: 42 });
    fixture.detectChanges();
    
    const rows = fixture.debugElement.queryAll(By.css('.device-spec-value'));
    expect(rows[0].nativeElement.textContent).toContain('FW1.2.3');
    expect(rows[1].nativeElement.textContent).toContain('42'); // Should contain the distance value
  });

  it('should render empty values when data is null', () => {
    fixture.componentRef.setInput('data', null);
    fixture.detectChanges();
    
    const rows = fixture.debugElement.queryAll(By.css('.device-spec-value'));
    expect(rows[0].nativeElement.textContent).toBe('');
    expect(rows[1].nativeElement.textContent).toContain('0'); // Should show 0 when data is null due to ?? 0
  });
});
