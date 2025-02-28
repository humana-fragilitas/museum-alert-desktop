import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { AuthenticatorService, AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { ProvisioningService } from '../core/services/provisioning.service';
import { DeviceService } from '../core/services/device.service';

/**
 * humana.fragilitas@gmail.com
 * zZ&c0qIz
 */

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [
    AmplifyAuthenticatorModule
  ]
})
export class HomeComponent implements OnInit {

  constructor(
    private router: Router,
    private provisioningService: ProvisioningService,
    private authenticatorService: AuthenticatorService,
    public deviceService: DeviceService
  ) { }

  ngOnInit(): void {
    console.log('HomeComponent INIT');
  }

  createProvisioningClaim() {

    this.provisioningService.createClaim();
  
  }

  signOut() {
    this.authenticatorService.signOut();
  }

}


 