// app/app.config.ts
import { ApplicationConfig, importProvidersFrom, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HttpClient } from '@angular/common/http';

// Routes
import { routes } from './app.routes';

// Interceptors
import { authTokenInterceptor } from './core/interceptors/auth-token.interceptor';

// Translation
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

// Services for early instantiation
import { ElectronService } from './core/services/electron/electron.service';
import { AuthService } from './core/services/auth/auth.service';
import { CompanyService } from './core/services/company/company.service';
import { RedirectService } from './core/services/redirect/redirect.service';
import { AuthenticatorService } from '@aws-amplify/ui-angular';
import { MqttService } from './core/services/mqtt/mqtt.service';
import { PolicyService } from './core/services/policy/policy.service';
import { STEPPER_GLOBAL_OPTIONS } from '@angular/cdk/stepper';

// AoT requires an exported function for factories
export function httpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

// Early services instantiation
function instantiateEarlyServices() {
  const mqttService = inject(MqttService);
  const policyService = inject(PolicyService);
  const electronService = inject(ElectronService);
  const authService = inject(AuthService);
  const authenticatorService = inject(AuthenticatorService);
  const companyService = inject(CompanyService);
  const redirectService = inject(RedirectService);
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