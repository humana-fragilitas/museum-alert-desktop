import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';

import { AuthenticatorService, AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { ProvisioningService } from '../core/services/provisioning/provisioning.service';
import { DeviceService } from '../core/services/device/device.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import {MatListModule} from '@angular/material/list';
import { CompanyFormComponent } from '../shared/components/company-form/company-form.component';
import { MatButtonModule } from '@angular/material/button';

/**
 * humana.fragilitas@gmail.com
 * zZ&c0qIz
 */

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [ RouterModule,
             MatIconModule,
             MatCardModule,
             MatListModule,
             MatButtonModule,
             CompanyFormComponent]
})
export class ProfileComponent implements OnInit {

  constructor(
  ) { }

  ngOnInit(): void {
    console.log('ProfileComponent INIT');
  }


}
 
