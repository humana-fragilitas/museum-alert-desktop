import { enableProdMode, provideAppInitializer, inject } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { APP_CONFIG } from './environments/environment';
// import { CoreModule } from './app/core/core.module';
import { TranslateModule, TranslateLoader, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { HomeComponent } from './app/features/home/home.component';
import { DeviceComponent } from './app/features/device/device.component';
import { ProfileComponent } from './app/features/profile/profile.component';
import { authTokenInterceptor } from './app/core/interceptors/auth-token.interceptor';
import { CompanyResolver } from './app/core/resolvers/company.resolver';
import { initializeConditionalConsole } from './app/shared/helpers/console.helper';
import { ElectronService } from './app/core/services/electron/electron.service';
import { AuthService } from './app/core/services/auth/auth.service';
import { CompanyService } from './app/core/services/company/company.service';
import { RedirectService } from './app/core/services/redirect/redirect.service';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { MqttService } from './app/core/services/mqtt/mqtt.service';
import { PolicyService } from './app/core/services/policy/policy.service';

function instantiateEarlyServices() {

  const mqttService = inject(MqttService);
  const policyService = inject(PolicyService);
  const electronService = inject(ElectronService);
  const authService = inject(AuthService);
  const authenticatorService = inject(AuthenticatorService);
  const companyService = inject(CompanyService);
  const redirectService = inject(RedirectService);

}

// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader => 
  new TranslateHttpLoader(http, './assets/i18n/', '.json');

if (APP_CONFIG.production) {
  enableProdMode();
}

initializeConditionalConsole();

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptors([authTokenInterceptor])),
    provideRouter([
      {
        path: '',
        redirectTo: 'index',
        pathMatch: 'full'
      },
      {
        path: 'index',
        component: HomeComponent
      },
      {
        // TO DO: add user in session guard
        path: 'device',
        component: DeviceComponent
      },
      {
        // TO DO: add user in session guard
        path: 'profile',
        component: ProfileComponent,
        resolve: [CompanyResolver]
      }
      // Uncomment when you have PageNotFoundComponent
      // {
      //   path: '**',
      //   component: PageNotFoundComponent
      // }
    ]),
    provideAnimations(),
    importProvidersFrom(
      // CoreModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient]
        }
      })
    ),
    provideAppInitializer(instantiateEarlyServices)
  ]
}).catch(err => console.error(err));