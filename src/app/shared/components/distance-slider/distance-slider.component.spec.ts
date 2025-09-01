import { TestBed,
         ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { DistanceSliderComponent } from './distance-slider.component';
import { FormatDistancePipe } from '@pipes/format-distance.pipe';
import { DeviceConfigurationService } from '@services/device-configuration/device-configuration.service';
import { DialogService } from '@services/dialog/dialog.service';
import { DialogType } from '@models/ui.models';


const mockSettingsSignal = signal<any>({ distance: 10 });
const mockIsBusySignal = signal(false);

const mockFormatDistancePipe = { transform: jest.fn((v: number) => `${v}cm`) };
const mockDeviceConfigService = {
  settings: mockSettingsSignal,
  isBusy: mockIsBusySignal,
  saveSettings: jest.fn().mockResolvedValue(undefined)
};
const mockDialogService = { openDialog: jest.fn() };

describe('DistanceSliderComponent', () => {
  let fixture: ComponentFixture<DistanceSliderComponent>;
  let component: DistanceSliderComponent;
  let consoleSpy: jest.SpyInstance;
  let consoleDirSpy: jest.SpyInstance;

  // Mock JSON.stringify to avoid circular structure errors in tests
  beforeAll(() => {
    const originalStringify = JSON.stringify;
    jest.spyOn(JSON, 'stringify').mockImplementation((value, replacer, space) => {
      try {
        return originalStringify(value, (key, val) => {
          // Avoid circular references by filtering out certain objects
          if (val && typeof val === 'object' && val.constructor && val.constructor.name === 'ZoneImpl') {
            return '[Zone]';
          }
          if (val && typeof val === 'object' && val.constructor && val.constructor.name === '_ZoneDelegate') {
            return '[ZoneDelegate]';
          }
          if (typeof replacer === 'function') {
            return (replacer as any)(key, val);
          }
          return val;
        }, space);
      } catch (error) {
        return '[Mocked JSON - Circular Reference]';
      }
    });
  });
  afterAll(() => {
    (JSON.stringify as jest.Mock).mockRestore();
  });

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    consoleDirSpy = jest.spyOn(console, 'dir').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [DistanceSliderComponent],
      providers: [
        { provide: FormatDistancePipe, useValue: mockFormatDistancePipe },
        { provide: DeviceConfigurationService, useValue: mockDeviceConfigService },
        { provide: DialogService, useValue: mockDialogService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DistanceSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    consoleDirSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('DistanceSliderComponent INIT');
  });

  it('should render slider with correct min, max, and value', () => {
    const slider = fixture.debugElement.query(By.css('mat-slider'));
    expect(slider.attributes['ng-reflect-min']).toBe('2');
    expect(slider.attributes['ng-reflect-max']).toBe('400');
    expect(component.sliderValue()).toBe(10);
  });

  it('should disable slider if isBusy or disabled input is true', () => {
    mockIsBusySignal.set(true);
    fixture.detectChanges();
    const slider = fixture.debugElement.query(By.css('mat-slider'));
    expect(slider.attributes['ng-reflect-disabled']).toBe('true');
    
    mockIsBusySignal.set(false);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const sliderAfter = fixture.debugElement.query(By.css('mat-slider'));
    expect(sliderAfter.attributes['ng-reflect-disabled']).toBe('true');
  });

  it('should validate min/max values and warn if invalid', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    fixture.componentRef.setInput('minValue', -1);
    fixture.detectChanges();
    expect(component.validatedMinValue()).toBe(2);
    fixture.componentRef.setInput('maxValue', 0);
    fixture.detectChanges();
    expect(component.validatedMaxValue()).toBe(400);
    warnSpy.mockRestore();
  });

  it('should clamp value between min and max', () => {
    fixture.componentRef.setInput('value', 1000);
    fixture.detectChanges();
    expect(component.validatedValue()).toBe(component.validatedMaxValue());
    fixture.componentRef.setInput('value', 1);
    fixture.detectChanges();
    expect(component.validatedValue()).toBe(component.validatedMinValue());
  });

  it('should call saveSettings and log on slider change (success)', async () => {
    const event = { target: { value: '42' } } as any;
    await component.onSliderChange(event);
    expect(mockDeviceConfigService.saveSettings).toHaveBeenCalledWith({ distance: 42 });
    expect(consoleSpy).toHaveBeenCalledWith('Setting minimum alarm distance to: 42 cm');
    expect(consoleSpy).toHaveBeenCalledWith('[DistanceSliderComponent]: distance threshold saved successfully');
  });

  it('should call dialogService.openDialog on save error', async () => {
    mockDeviceConfigService.saveSettings.mockRejectedValueOnce(new Error('fail'));
    const event = { target: { value: '99' } } as any;
    await component.onSliderChange(event);
    expect(mockDialogService.openDialog).toHaveBeenCalledWith(expect.objectContaining({ type: DialogType.ERROR }));
    expect(consoleSpy).toHaveBeenCalledWith('[DistanceSliderComponent]: error while saving distance threshold');
  });

  it('should format distance using pipe', () => {
    expect(component.toReadableDistance(123)).toBe('123cm');
    expect(mockFormatDistancePipe.transform).toHaveBeenCalledWith(123);
  });
});
