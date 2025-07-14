import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { CompanyService } from '../../../core/services/company/company.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { RouterModule } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';

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

  public readonly isFetchingCompany$ = this.companyService.isFetchingCompany$;
  public readonly userAttributes$ = this.authService.userAttributes$;

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
