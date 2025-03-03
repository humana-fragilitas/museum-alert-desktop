import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import { WebviewDirective } from './directives/';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { WiFiCredentialsComponent } from './components/wifi-credentials/wifi-credentials.component';
import { DeviceService } from '../core/services/device.service';
import { CoreModule } from '../core/core.module';

@NgModule({
  declarations: [WebviewDirective, WiFiCredentialsComponent],
  imports: [CommonModule, CoreModule, TranslateModule, FormsModule, ReactiveFormsModule],
  exports: [TranslateModule, CoreModule, WebviewDirective, FormsModule, ReactiveFormsModule, WebviewDirective, WiFiCredentialsComponent],
  providers: [DeviceService],
})
export class SharedModule {}
