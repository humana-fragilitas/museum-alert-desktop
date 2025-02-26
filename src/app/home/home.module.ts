import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { HomeRoutingModule } from './home-routing.module';

import { HomeComponent } from './home.component';
import { SharedModule } from '../shared/shared.module';

import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { WiFiCredentialsComponent } from '../shared/components/wifi-credentials/wifi-credentials.component';

@NgModule({
  declarations: [HomeComponent, WiFiCredentialsComponent],
  imports: [CommonModule, SharedModule, HomeRoutingModule, AmplifyAuthenticatorModule],
  exports: [AmplifyAuthenticatorModule] 
})
export class HomeModule {}
