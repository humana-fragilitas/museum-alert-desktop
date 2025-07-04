import { Component, Input, OnDestroy, OnInit, Output, EventEmitter } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { DeviceConfiguration } from '../../../core/services/mqtt/mqtt.service';
import { FormatDistancePipe } from '../../pipes/format-distance.pipe';
import { MatSliderModule } from '@angular/material/slider';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-distance-slider',
  templateUrl: './distance-slider.component.html',
  styleUrls: ['./distance-slider.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    FormatDistancePipe,
    MatSliderModule
  ]
})
export class DistanceSliderComponent implements OnInit {
  private minDefaultValue = 0;
  private maxDefaultValue = 500;
  
  // Backing fields to store the actual values
  private _minValue: number = this.minDefaultValue;
  private _maxValue: number = this.maxDefaultValue;
  private _value: number = this.minDefaultValue; // Backing field for current value

  @Input()
  set minValue(value: number) {
    if (value < 0) {
      console.warn(`Distance slider minimum value cannot be negative, ` +
        `using default ${this.minDefaultValue}`);
      this._minValue = this.minDefaultValue;
    } else if (value >= this._maxValue) {
      console.warn(`Distance slider minimum cannot be greater than or ` +
        `equal to maximum value (${this._maxValue})`);
      this._minValue = Math.max(0, this._maxValue - 1);
    } else {
      this._minValue = value;
    }
  }
  
  get minValue(): number {
    return this._minValue;
  }

  @Input()
  set maxValue(value: number) {
    if (value <= 0) {
      console.warn(`Distance slider maximum value must be positive, ` +
        `using default ${this.maxDefaultValue}`);
      this._maxValue = this.maxDefaultValue;
    } else if (value <= this._minValue) {
      console.warn(`Distance slider maximum value must be greater ` +
        `than minimum value`);
      this._maxValue = this._minValue + 1;
    } else {
      this._maxValue = value;
    }
  }
  
  get maxValue(): number {
    return this._maxValue;
  }

  // Add value input property
  @Input()
  set value(val: number) {
    if (val != null) {
      // Clamp the value between min and max
      this._value = Math.max(this._minValue, Math.min(this._maxValue, val));
    }
  }
  
  get value(): number {
    return this._value;
  }

  // This getter is used by ngModel in the template
  get sliderValue(): number {
    return this._value;
  }

  set sliderValue(val: number) {
    this._value = val;
  }

  @Input() disabled: boolean = true;
  @Output() onSliderChange = new EventEmitter<number>();

  constructor(
    private formatDistancePipe: FormatDistancePipe
  ) {}

  ngOnInit(): void {
    console.log('DistanceSliderComponent INIT');
  }

  onSliderValue(event: Event) {
    const distance = Number((event.target as HTMLInputElement).value);
    this._value = distance; // Update internal value
    this.onSliderChange.emit(distance);
  }

  toReadableDistance(value: number): string {
    return this.formatDistancePipe.transform(value);
  }
}