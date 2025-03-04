import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
// import { PageNotFoundComponent } from './shared/components';
import { HomeComponent } from './home/home.component';
import { DeviceComponent } from './shared/components/device/device.component';

const routes: Routes = [
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
    path: 'device/:path/:serial',
    component: DeviceComponent
  },

  // {
  //   path: '**',
  //   component: PageNotFoundComponent
  // }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {}),
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
