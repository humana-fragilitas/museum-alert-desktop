import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeviceService } from './services/device.service';
import { PolicyService } from './services/policy.service';
import { AuthService } from './services/auth.service';
import { EventBusService } from './services/event-bus.service';
import { MqttService } from './services/mqtt.service';
import { ProvisioningService } from './services/provisioning.service';
import { ErrorService } from './services/error.service';
import { NotificationService } from './services/notification.service';

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
    NotificationService]
})
export class CoreModule { }
