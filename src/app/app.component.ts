import { TranslateService } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

import { Component } from '@angular/core';
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

  constructor(private readonly translate: TranslateService,
              private readonly authService: AuthService) {

    this.translate.setDefaultLang('en');
    console.log('APP_CONFIG', APP_CONFIG);
  
  }

}
