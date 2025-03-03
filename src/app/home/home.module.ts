import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';

import { HomeComponent } from './home.component';
import { SharedModule } from '../shared/shared.module';

import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { CoreModule } from '../core/core.module';

@NgModule({
  declarations: [HomeComponent],
  imports: [CommonModule, SharedModule, CoreModule, HomeRoutingModule, AmplifyAuthenticatorModule],
  exports: [AmplifyAuthenticatorModule, CoreModule, SharedModule] 
})
export class HomeModule {}
