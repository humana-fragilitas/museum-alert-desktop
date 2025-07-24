import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { TranslatePipe } from '@ngx-translate/core';

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

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
  
  // Convert observables to signals
  readonly isFetchingCompany = toSignal(this.companyService.isFetchingCompany$);
  readonly userAttributes = toSignal(this.authService.userAttributes$);

  constructor(
    private readonly companyService: CompanyService,
    private readonly authService: AuthService,
    private readonly authenticatorService: AuthenticatorService
  ) {}

  ngOnInit(): void {
    console.log('NavBarComponent INIT');
  }

  signOut() {
    this.authenticatorService.signOut();
  }
}