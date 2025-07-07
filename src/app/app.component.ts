import { Component } from '@angular/core';
import { ElectronService } from './core/services/electron/electron.service';
import { AuthService } from './core/services/auth/auth.service';
import { MqttService } from './core/services/mqtt/mqtt.service'; 
import { PolicyService } from './core/services/policy/policy.service';
import { TranslateService } from '@ngx-translate/core';
import { APP_CONFIG } from '../environments/environment';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { ErrorService } from './core/services/error/error.service';
import { NotificationService } from './core/services/notification/notification.service';
import { RedirectService } from './core/services/redirect/redirect.service';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule, MatIconRegistry } from '@angular/material/icon';
import { CompanyService } from './core/services/company/company.service';
import { MatProgressSpinner, MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    CommonModule,        // This includes AsyncPipe, NgIf, etc.
    RouterOutlet,        // For <router-outlet>
    MatButtonModule,
    RouterModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
})
export class AppComponent {

  public readonly isFetchingCompany$ = this.companyService.isFetchingCompany$;
  public readonly user$ = this.authService.user$;
  public readonly userAttributes$ = this.authService.userAttributes$;

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private mqttService: MqttService,
    private authService: AuthService,
    private policyService: PolicyService,
    private authenticatorService: AuthenticatorService,
    private notificationService: NotificationService,
    private redirectService: RedirectService,
    private companyService: CompanyService,
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