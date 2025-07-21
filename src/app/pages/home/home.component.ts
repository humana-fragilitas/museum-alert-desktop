import { Component, OnInit, ViewEncapsulation } from '@angular/core';

import { AuthenticatorService, AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { ProvisioningService } from '../../core/services/provisioning/provisioning.service';
import { DeviceService } from '../../core/services/device/device.service';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';


@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    AmplifyAuthenticatorModule,
    TranslatePipe
  ],
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {

  ngOnInit(): void {
    console.log('[HomeComponent] ngOnInit');
  }

}
 
