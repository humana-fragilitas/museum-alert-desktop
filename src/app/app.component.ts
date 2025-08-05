import { TranslateService } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { Component } from '@angular/core';
import { ElectronService } from '@services/electron/electron.service';
import { AuthService } from '@services/auth/auth.service';
import { APP_CONFIG } from '@env/environment';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { NavBarComponent } from '@shared/components/nav-bar/nav-bar.component';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    CommonModule,
    RouterOutlet,
    NavBarComponent,
    ...COMMON_MATERIAL_IMPORTS
  ],
})
export class AppComponent {

  public readonly user = this.authService.user;

  constructor(
    private electronService: ElectronService,
    private translate: TranslateService,
    private authService: AuthService
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

  cancelSession() {
    this.authService.cancelSession();
  }

}

/* EXAMPLE OF STANDARD IMPORTS

// External libraries
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';

// Angular
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

// Absolute imports (your app)
import { AuthService } from '@core/services/auth.service';
import { User, ApiResponse } from '@shared/models';
import { APP_CONFIG } from '@/environments/environment';

// Relative imports (nearby files)
import { UserDialogComponent } from './user-dialog.component';
import { UserFormData } from '../models/user-form.interface';

*/

/*

MIGRATION TO SIGNALS

Migration Priority
High Priority (Start Here)

Simple component state - boolean flags, primitive values
Computed properties - derived values that depend on other state
Service state management - replace BehaviorSubjects with signals

Medium Priority

Form state - combine reactive forms with signals
API data fetching - use resource API for cleaner data loading
Cross-component communication - simple state sharing

Low Priority (Keep for Now)

Complex async flows - RxJS operators are still better for complex streams
HTTP interceptors - continue using Observables
Router events - Angular's router still uses Observables

*/