import { Component,
         input,
         OnInit,
         signal,
         computed,
         effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { FormatDistancePipe } from '@pipes/format-distance.pipe';
import { DeviceConfigurationService } from '@services/device-configuration/device-configuration.service';
import { FORM_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { DialogService } from '@services/dialog/dialog.service';
import { DialogType } from '@models/ui.models';


@Component({
  selector: 'app-distance-slider',
  templateUrl: './distance-slider.component.html',
  styleUrls: ['./distance-slider.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ...FORM_MATERIAL_IMPORTS
  ]
})
export class DistanceSliderComponent implements OnInit {

  private minDefaultValue = 2;
  private maxDefaultValue = 400;
  private minValueSignal = signal<number>(this.minDefaultValue);
  private maxValueSignal = signal<number>(this.maxDefaultValue);
  private valueSignal = signal<number>(this.minDefaultValue);

  minValue = input<number>(this.minDefaultValue);
  maxValue = input<number>(this.maxDefaultValue);
  value = input<number>(this.minDefaultValue);
  disabled = input<boolean>(false);
  sliderValue = signal<number>(this.minDefaultValue);

  get sliderValueForModel(): number {
    return this.sliderValue();
  }
  
  set sliderValueForModel(value: number) {
    this.sliderValue.set(value);
  }
  
  readonly isBusy = this.deviceConfigurationService.isBusy;
  validatedMinValue = computed(() => {
      const value = this.minValue();
      const maxVal = this.maxValueSignal();
      if (value < 0) {
        console.warn(`Distance slider minimum value cannot be negative, ` +
          `using default ${this.minDefaultValue}`);
        return this.minDefaultValue;
      } else if (value >= maxVal) {
        console.warn(`Distance slider minimum cannot be greater than or ` +
          `equal to maximum value (${maxVal})`);
        return Math.max(0, maxVal - 1);
      } else {
        return value;
      }
    });

  validatedMaxValue = computed(() => {
    const value = this.maxValue();
    const minVal = this.minValueSignal();
    
    if (value <= 0) {
      console.warn(`Distance slider maximum value must be positive, ` +
        `using default ${this.maxDefaultValue}`);
      return this.maxDefaultValue;
    } else if (value <= minVal) {
      console.warn(`Distance slider maximum value must be greater ` +
        `than minimum value`);
      return minVal + 1;
    } else {
      return value;
    }
  });

  validatedValue = computed(() => {
    const val = this.value();
    if (val != null) {
      return Math.max(this.validatedMinValue(), Math.min(this.validatedMaxValue(), val));
    }
    return this.minDefaultValue;
  });

  constructor(
    private formatDistancePipe: FormatDistancePipe,
    private deviceConfigurationService: DeviceConfigurationService,
    private dialogService: DialogService
  ) {

    const properties = this.deviceConfigurationService.settings;
    
    effect(() => {
      const configuration = properties();
      if (configuration) {
        this.sliderValue.set(configuration.distance!);
      }
    });

    effect(() => {
      this.minValueSignal.set(this.validatedMinValue());
      this.maxValueSignal.set(this.validatedMaxValue());
      this.valueSignal.set(this.validatedValue());
    });

  }

  ngOnInit(): void {
    console.log('DistanceSliderComponent INIT');
  }

  async onSliderChange(event: Event) {

    const distance = Number((event.target as HTMLInputElement).value);
    this.valueSignal.set(distance);
    this.sliderValue.set(Number(distance));

    console.log(`Setting minimum alarm distance to: ${distance} cm`);

    try {
      await this.deviceConfigurationService.saveSettings({ distance });
      console.log('[DistanceSliderComponent]: distance threshold saved successfully');
    } catch (error) {
      console.log('[DistanceSliderComponent]: error while saving distance threshold');
      this.dialogService.openDialog({
        type: DialogType.ERROR,
        title: 'ERRORS.APPLICATION.DEVICE_CONFIGURATION_UPDATE_FAILED_TITLE',
        message: 'ERRORS.APPLICATION.DEVICE_CONFIGURATION_UPDATE_FAILED_MESSAGE'
      });
    }

  }

  toReadableDistance(value: number): string {
    return this.formatDistancePipe.transform(value);
  }

}