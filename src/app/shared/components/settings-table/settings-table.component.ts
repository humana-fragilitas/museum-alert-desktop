import { TranslatePipe } from '@ngx-translate/core';

import { Component, input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import { DeviceConfiguration } from '@models';
import { FormatDistancePipe } from '@pipes/format-distance.pipe';


@Component({
  selector: 'app-settings-table',
  templateUrl: './settings-table.component.html',
  styleUrls: ['./settings-table.component.scss'],
  imports: [
    CommonModule,
    FormatDistancePipe,
    TranslatePipe
  ]
})
export class SettingsTableComponent implements OnInit {
  
  // Convert @Input to input signal (Angular 19)
  data = input<DeviceConfiguration | null>(null);

  ngOnInit(): void {
    console.log('SettingsTableComponent INIT');
  }
}