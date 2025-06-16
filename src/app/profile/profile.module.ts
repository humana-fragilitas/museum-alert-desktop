import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { SharedModule } from '../shared/shared.module';

import { AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { CoreModule } from '../core/core.module';
import { ProfileComponent } from './profile.component';

@NgModule({
  declarations: [ProfileComponent],
  imports: [CommonModule, SharedModule, CoreModule],
  exports: [] 
})
export class ProfileModule {}
