import { Component } from '@angular/core';
import { ElectronService } from './core/services/electron/electron.service';
import { AuthService } from './core/services/auth/auth.service';
import { TranslateService } from '@ngx-translate/core';
import { APP_CONFIG } from '../environments/environment';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { CompanyService } from './core/services/company/company.service';
import { COMMON_MATERIAL_IMPORTS } from './shared/utils/material-imports';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    ...COMMON_MATERIAL_IMPORTS
  ],
})
export class AppComponent {

  public readonly isFetchingCompany$ = this.companyService.isFetchingCompany$;
  public readonly user$ = this.authService.user$;
  public readonly userAttributes$ = this.authService.userAttributes$;

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private authService: AuthService,
    private authenticatorService: AuthenticatorService,
    private companyService: CompanyService
  ) {

    this.translate.setDefaultLang('en');
    console.log('APP_CONFIG', APP_CONFIG);

    if (electronService.isElectron) {
      console.log(process.env); 
      console.log('Run in electron');
      console.log('Electron ipcRenderer', this.electronService.ipcRenderer);
      console.log('NodeJS childProcess', this.electronService.childProcess);
    } else {
      console.log('Run in browser');
    }
  
  }

  signOut() {
    this.authenticatorService.signOut();
  }

}