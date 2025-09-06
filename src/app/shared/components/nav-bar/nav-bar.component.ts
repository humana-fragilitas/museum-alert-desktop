import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { TranslatePipe } from '@ngx-translate/core';

import { Component,
         OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { CompanyService } from '@services/company/company.service';
import { AuthService } from '@services/auth/auth.service';


@Component({
  selector: 'app-nav-bar',
  templateUrl: './nav-bar.component.html',
  styleUrls: ['./nav-bar.component.scss'],
  imports: [
    CommonModule,
    RouterModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class NavBarComponent implements OnInit {
  
  readonly isFetchingCompany = this.companyService.isFetchingCompany;
  readonly userAttributes = this.authService.userAttributes;

  constructor(private readonly companyService: CompanyService,
              private readonly authService: AuthService,
              private readonly authenticatorService: AuthenticatorService) { }

  ngOnInit() {
    console.log('[NavBarComponent]: INIT');
  }

  signOut() {
    this.authenticatorService.signOut();
  }
  
}