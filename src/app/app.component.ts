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

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  detectedPorts: string[] = [];

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private mqttService: MqttService,
    private authService: AuthService,
    private policyService: PolicyService,
    private authenticatorService: AuthenticatorService,
    private notificationService: NotificationService,
    private redirectService: RedirectService
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
