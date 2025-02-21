import { Component } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonItem } from '@ionic/angular/standalone';
import { ExploreContainerComponent } from '../explore-container/explore-container.component';
import { JsonPipe, NgIf } from '@angular/common';

import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { IonCol, IonGrid, IonRow, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { DeviceService } from '../shared/device.service';
import { BluetoothService } from '../shared/bluetooth.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: true,
  imports: [
    NgIf,
    JsonPipe,
    IonHeader,
    IonRow,
    IonButton,
    IonIcon,
    IonGrid,
    IonCol,
    IonToolbar,
    IonTitle,
    IonContent,
    ExploreContainerComponent,
    AmplifyAuthenticatorModule
  ],
})
export class Tab1Page {

  constructor(
    private deviceService: DeviceService, 
    public bluetoothService: BluetoothService,
    public authenticatorService: AuthenticatorService) { }

  addDevice() {

    this.deviceService.register('MAS-123456789');

  }

  scanDevices() {

    this.bluetoothService.scanDevices();

  }

  createProvisioningClaim() {

    this.deviceService.createProvisioningClaim();

  }


}
