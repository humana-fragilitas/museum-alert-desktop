import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { DeviceConfiguration } from '../../../core/models';
import { FormatDistancePipe } from '../../pipes/format-distance.pipe';
 
@Component({
  selector: 'app-settings-table',
  templateUrl: './settings-table.component.html',
  styleUrls: ['./settings-table.component.scss'],
  imports: [
    CommonModule,
    FormatDistancePipe
  ]
})
export class SettingsTableComponent implements OnInit, OnDestroy {

  @Input() data$!: Observable<DeviceConfiguration | null>;

  ngOnInit(): void {

    console.log('SettingsTableComponent INIT');
    
  }

  ngOnDestroy(): void {


  }
  
}
