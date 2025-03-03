import { Component, OnInit, OnDestroy } from '@angular/core';
import { DeviceService } from '../../../../app/core/services/device.service';
import { Observable, Subscription } from 'rxjs';
import { DeviceAppState } from '../../../../../shared/models';

@Component({
  selector: 'app-device',
  templateUrl: './device.component.html',
  styleUrls: ['./device.component.scss'],
  imports: [],
})
export class DeviceComponent implements OnInit {

  public deviceAppState = DeviceAppState;

  constructor(public deviceService: DeviceService) { }

  ngOnInit(): void {
    console.log('Device INIT');
  }

}
