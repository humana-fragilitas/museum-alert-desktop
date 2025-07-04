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
import { DialogComponent } from './components/dialog/dialog.component';

import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatStepperModule} from '@angular/material/stepper';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import {MatCardModule} from '@angular/material/card';
import {MatChipsModule} from '@angular/material/chips';
import {MatDialogModule} from '@angular/material/dialog'
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner'
import {MatExpansionModule} from '@angular/material/expansion';
import { DeviceStateComponent } from './components/device-state/device-state.component';
import { ProvisioningComponent } from './components/provisioning/provisioning.component';
import { DeviceControlComponent } from './components/device-control/device-control.component';
import { MatSliderModule } from '@angular/material/slider';
import { DeviceDiagnosticsComponent } from './components/device-diagnostics/device-diagnostics.component';
import { ConnectionStatusComponent } from './components/connection-status/connection-status.component';
import { SettingsTableComponent } from './components/settings-table/settings-table.component';



@NgModule({
  declarations: [

  ],
  imports: [
    WiFiCredentialsComponent,
    DeviceComponent,
    WizardComponent,
    DeviceStateComponent,
    ProvisioningComponent,
    DeviceControlComponent,
    DeviceDiagnosticsComponent,
    ConnectionStatusComponent,
    SettingsTableComponent,
    DialogComponent,
    WebviewDirective,
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
    MatProgressSpinnerModule,
    MatSliderModule,
    MatDialogModule,
    MatExpansionModule
    
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
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSliderModule,
    MatExpansionModule,
    WebviewDirective,
    WiFiCredentialsComponent,
    DeviceComponent,
    ProvisioningComponent,
    DeviceControlComponent,
    DeviceDiagnosticsComponent,
    ConnectionStatusComponent,
    DialogComponent
  ],
  providers: [DeviceService],
})
export class SharedModule {}