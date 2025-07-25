import { TranslateModule,
         TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { Amplify } from 'aws-amplify';

import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';
import { ApplicationConfig,
         importProvidersFrom,
         inject,
         provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient,
         withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';

import { routes } from './app.routes';
import { authTokenInterceptor } from '@interceptors/auth-token.interceptor';
import { ElectronService } from '@services/electron/electron.service';
import { AuthService } from '@services/auth/auth.service';
import { CompanyService } from '@services/company/company.service';
import { RedirectService } from '@services/redirect/redirect.service';
import { MqttService } from '@services/mqtt/mqtt.service';
import { PolicyService } from '@services/policy/policy.service';
import { APP_CONFIG } from '@env/environment';
import { NotificationService } from '@services/notification/notification.service';


// AoT requires an exported function for factories
export function httpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Early services instantiation
function instantiateEarlyServices() {

  Amplify.configure(APP_CONFIG.aws.amplify);

  const mqttService = inject(MqttService);
  const policyService = inject(PolicyService);
  const electronService = inject(ElectronService);
  const authService = inject(AuthService);
  const authenticatorService = inject(AuthenticatorService);
  const companyService = inject(CompanyService);
  const redirectService = inject(RedirectService);
  const notificationService = inject(NotificationService);
  
}

export const appConfig: ApplicationConfig = {

  providers: [
    // HTTP Client with interceptors
    provideHttpClient(withInterceptors([authTokenInterceptor])),
    
    // Router
    provideRouter(routes),
    
    // Animations
    provideAnimations(),
    
    // Translation module
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient]
        }
      })
    ),
    
    // App initializer for early services
    provideAppInitializer(instantiateEarlyServices),
    {
      provide: STEPPER_GLOBAL_OPTIONS,
      useValue: { displayDefaultIndicatorType: false }
    }
  ]
  
};