// app/app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from './features/home/home.component';
import { DeviceComponent } from './features/device/device.component';
import { ProfileComponent } from './features/profile/profile.component';
import { CompanyResolver } from './core/resolvers/company.resolver';
import { userSessionGuard } from './core/guards/user-session.guard';
import { publicOnlyGuard } from './core/guards/public-only.guard';

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