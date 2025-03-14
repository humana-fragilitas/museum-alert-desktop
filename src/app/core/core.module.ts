import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from './services/device/device.service';
import { PolicyService } from './services/policy/policy.service';
import { AuthService } from './services/auth/auth.service';
import { EventBusService } from './services/event-bus/event-bus.service';
import { MqttService } from './services/mqtt/mqtt.service';
import { ProvisioningService } from './services/provisioning/provisioning.service';
import { ErrorService } from './services/error/error.service';
import { NotificationService } from './services/notification/notification.service';
import { RedirectService } from './services/redirect/redirect.service';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  providers: [
    DeviceService,
    PolicyService,
    AuthService,
    EventBusService,
    MqttService,
    ProvisioningService,
    ErrorService,
    NotificationService,
    RedirectService
  ]
})
export class CoreModule { }
