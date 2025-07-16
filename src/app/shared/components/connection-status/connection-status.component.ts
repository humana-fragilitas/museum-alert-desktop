import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe } from '@ngx-translate/core';
import { DeviceConnectionStatusService } from '../../../core/services/device-connection-status/device-connection-status.service';

@Component({
  selector: 'app-connection-status',
  templateUrl: './connection-status.component.html',
  styleUrls: ['./connection-status.component.scss'],
  imports: [
    CommonModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class ConnectionStatusComponent implements OnInit, OnChanges {

  @Input() deviceSN: string = '';
  
  public deviceConnectionStatus$!: Observable<boolean>;
  
  constructor(
    private readonly deviceConnectionStatusService: DeviceConnectionStatusService
  ) {}

  ngOnInit(): void {
    console.log('ConnectionStatusComponent INIT');
    
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['deviceSN'] && this.deviceSN) {
      this.deviceConnectionStatus$ = this.deviceConnectionStatusService
                                         .onChange(this.deviceSN);
    }
  }

}