import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CompanyFormComponent } from '../../shared/components/company-form/company-form.component';
import { CompanyService } from '../../core/services/company/company.service';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth/auth.service';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '../../shared/utils/material-imports';
// import { CoreModule } from '../../core/core.module';

/**
 * humana.fragilitas@gmail.com
 * zZ&c0qIz
 */

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ...COMMON_MATERIAL_IMPORTS,
    ...FORM_MATERIAL_IMPORTS,
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
 
