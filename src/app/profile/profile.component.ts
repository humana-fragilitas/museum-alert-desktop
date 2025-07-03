import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router, RouterLink, RouterModule } from '@angular/router';

import { AuthenticatorService, AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { ProvisioningService } from '../core/services/provisioning/provisioning.service';
import { DeviceService } from '../core/services/device/device.service';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import {MatListModule} from '@angular/material/list';
import {MatTableModule} from '@angular/material/table'
import { CompanyFormComponent } from '../shared/components/company-form/company-form.component';
import { MatButtonModule } from '@angular/material/button';
import { CompanyService } from '../core/services/company/company.service';
import { map } from 'rxjs';
import { CommonModule } from '@angular/common';
import { AuthService } from '../core/services/auth/auth.service';
import { MatChip, MatChipsModule } from '@angular/material/chips';

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
             MatChipsModule,
             MatButtonModule,
             MatTableModule,
             CommonModule,
             CompanyFormComponent]
})
export class ProfileComponent implements OnInit {

  public readonly displayedColumns: string[] = ['username', 'role', 'joined'];
  public readonly loginId = this.authService.sessionData?.getValue()?.tokens?.signInDetails?.loginId
  public readonly company$ = this.companyService.company$;

  constructor(
    private companyService: CompanyService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('ProfileComponent INIT');
  }


}
 
