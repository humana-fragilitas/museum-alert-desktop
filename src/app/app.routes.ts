import { Routes } from '@angular/router';

import { HomeComponent } from './pages/home/home.component';
import { DeviceComponent } from './pages/device/device.component';
import { ProfileComponent } from './pages/profile/profile.component';
import { CompanyResolver } from '@resolvers/company.resolver';
import { userSessionGuard } from '@guards/user-session.guard';
import { publicOnlyGuard } from '@guards/public-only.guard';


export const routes: Routes = [
  {
    path: '',
    redirectTo: 'index',
    pathMatch: 'full'
  },
  {
    path: 'index',
    canActivate: [publicOnlyGuard],
    component: HomeComponent
  },
  {
    path: 'device',
    canActivate: [userSessionGuard],
    component: DeviceComponent
  },
  {
    path: 'profile',
    canActivate: [userSessionGuard],
    component: ProfileComponent,
    resolve: [CompanyResolver]
  },
  {
    // Redirect any unmatched paths to index
    path: '**',
    redirectTo: 'index'
  }
];