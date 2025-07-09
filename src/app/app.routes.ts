// app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { DeviceComponent } from './features/device/device.component';
import { ProfileComponent } from './features/profile/profile.component';
import { CompanyResolver } from './core/resolvers/company.resolver';

export const routes: Routes = [
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
    // TODO: add user in session guard
    path: 'device',
    component: DeviceComponent
  },
  {
    // TODO: add user in session guard
    path: 'profile',
    component: ProfileComponent,
    resolve: [CompanyResolver]
  }
  // TODO: Uncomment when you have PageNotFoundComponent
  // {
  //   path: '**',
  //   component: PageNotFoundComponent
  // }
];