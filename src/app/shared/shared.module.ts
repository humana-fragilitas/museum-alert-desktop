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
import { MatRadioModule } from '@angular/material/radio';
import {MatProgressSpinnerModule} from '@angular/material/progress-spinner'
import {MatExpansionModule} from '@angular/material/expansion';
import {MatDividerModule} from '@angular/material/divider';
import {MatListModule} from '@angular/material/list';
import { DeviceStateComponent } from './components/device-state/device-state.component';
import { ProvisioningComponent } from './components/provisioning/provisioning.component';
import { DeviceControlComponent } from './components/device-control/device-control.component';
import { MatSliderModule } from '@angular/material/slider';
import { DeviceDiagnosticsComponent } from './components/device-diagnostics/device-diagnostics.component';
import { FormatDistancePipe } from './pipes/format-distance.pipe';
import { ConnectionStatusComponent } from './components/connection-status/connection-status.component';
import { CompanyFormComponent } from './components/company-form/company-form.component';
import { RouterModule } from '@angular/router';



@NgModule({
  declarations: [
    WebviewDirective,
    WiFiCredentialsComponent,
    DeviceComponent,
    WizardComponent,
    DeviceStateComponent,
    ProvisioningComponent,
    DeviceControlComponent,
    DeviceDiagnosticsComponent,
    ConnectionStatusComponent,
    CompanyFormComponent,
    DialogComponent,
    FormatDistancePipe
  ],
  imports: [
    CommonModule,
    CoreModule,
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
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
    MatExpansionModule,
    MatRadioModule,
    MatDividerModule,
    MatListModule   
  ],
  exports: [
    TranslateModule,
    CoreModule,
    WebviewDirective,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
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
    MatRadioModule,
    MatDividerModule,
    MatListModule,
    WebviewDirective,
    WiFiCredentialsComponent,
    DeviceComponent,
    ProvisioningComponent,
    DeviceControlComponent,
    DeviceDiagnosticsComponent,
    FormatDistancePipe,
    ConnectionStatusComponent,
    DialogComponent,
    CompanyFormComponent
  ],
  providers: [DeviceService],
})
export class SharedModule {}