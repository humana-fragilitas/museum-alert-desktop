import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AppComponent } from './app/app.component';
import { APP_CONFIG } from './environments/environment';
import { CoreModule } from './app/core/core.module';
import { SharedModule } from './app/shared/shared.module';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { HomeComponent } from './app/home/home.component';
import { DeviceComponent } from './app/device/device.component';
import { ProfileComponent } from './app/profile/profile.component';
import { authTokenInterceptor } from './app/core/interceptors/auth-token.interceptor';
import { CompanyResolver } from './app/core/resolvers/company.resolver';

// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader => 
  new TranslateHttpLoader(http, './assets/i18n/', '.json');

if (APP_CONFIG.production) {
  enableProdMode();
}

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
        path: 'device',
        component: DeviceComponent
      },
      {
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
      CoreModule,
      SharedModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
}).catch(err => console.error(err));