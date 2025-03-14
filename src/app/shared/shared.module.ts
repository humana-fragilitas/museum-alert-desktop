import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import { WebviewDirective } from './directives/';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WiFiCredentialsComponent } from './components/wifi-credentials/wifi-credentials.component';
import { DeviceService } from '../core/services/device/device.service';
import { CoreModule } from '../core/core.module';
import { DeviceComponent } from '../device/device.component';
import { WizardComponent } from './components/wizard-component/wizard.component';

import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatStepperModule} from '@angular/material/stepper';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner'
import { DeviceStateComponent } from './components/device-state/device-state.component';


@NgModule({
  declarations: [
    WebviewDirective,
    WiFiCredentialsComponent,
    DeviceComponent,
    WizardComponent,
    DeviceStateComponent
  ],
  imports: [
    CommonModule,
    CoreModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  exports: [
    TranslateModule,
    CoreModule,
    WebviewDirective,
    FormsModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatStepperModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    WebviewDirective,
    WiFiCredentialsComponent,
    DeviceComponent
  ],
  providers: [DeviceService],
})
export class SharedModule {}
