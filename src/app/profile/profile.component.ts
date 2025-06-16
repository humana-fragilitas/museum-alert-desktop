import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';

import { AuthenticatorService, AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { ProvisioningService } from '../core/services/provisioning/provisioning.service';
import { DeviceService } from '../core/services/device/device.service';

/**
 * humana.fragilitas@gmail.com
 * zZ&c0qIz
 */

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {

  constructor(
  ) { }

  ngOnInit(): void {
    console.log('ProfileComponent INIT');
  }


}
 
