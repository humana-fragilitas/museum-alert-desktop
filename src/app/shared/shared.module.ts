import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { TranslateModule } from '@ngx-translate/core';

import { PageNotFoundComponent } from './components/';
import { WebviewDirective } from './directives/';
import { FormsModule } from '@angular/forms';
import { WiFiCredentialsComponent } from './components/wifi-credentials/wifi-credentials.component';
import { DeviceService } from '../core/services/device.service';

@NgModule({
  declarations: [PageNotFoundComponent, WebviewDirective, WiFiCredentialsComponent],
  imports: [CommonModule, TranslateModule, FormsModule],
  exports: [TranslateModule, WebviewDirective, FormsModule],
  providers: [DeviceService],
})
export class SharedModule {}
