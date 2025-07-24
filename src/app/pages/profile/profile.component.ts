import { TranslatePipe } from '@ngx-translate/core';

import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { CompanyFormComponent } from '@shared/components/company-form/company-form.component';
import { CompanyService } from '@services/company/company.service';
import { AuthService } from '@services/auth/auth.service';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '@shared/utils/material-imports';


@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS,
    ...FORM_MATERIAL_IMPORTS,
    CompanyFormComponent
  ]
})
export class ProfileComponent implements OnInit {

  public readonly displayedColumns: string[] = ['username', 'role', 'joined'];
  public readonly loginId = this.authService.userLoginId;
  public readonly company = this.companyService.organization;

  constructor(
    private companyService: CompanyService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    console.log('[ProfileComponent] ngOnInit');
  }

}
 
