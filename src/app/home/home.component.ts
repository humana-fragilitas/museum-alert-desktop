import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { DeviceService } from '../core/services/device.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: []
})
export class HomeComponent implements OnInit {

  constructor(
    private router: Router,
    private deviceService: DeviceService,
    private authenticatorService: AuthenticatorService
  ) { }

  ngOnInit(): void {
    console.log('HomeComponent INIT');
  }

  createProvisioningClaim() {

    this.deviceService.createProvisioningClaim();
  
  }

}


 