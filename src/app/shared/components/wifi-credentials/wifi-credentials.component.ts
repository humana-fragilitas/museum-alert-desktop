import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { DeviceService } from '../../../../app/core/services/device/device.service';
import { WiFiNetwork } from '@shared/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-wifi-credentials',
  templateUrl: './wifi-credentials.component.html',
  styleUrls: ['./wifi-credentials.component.scss'],
})
export class WiFiCredentialsComponent implements OnInit, OnDestroy {
  
  public wiFiNetworks: WiFiNetwork[] = [];

  credentialsForm = new FormGroup({
    ssid: new FormControl({ value: '', disabled: true }, [Validators.required]),
    password: new FormControl({ value: '', disabled: true }, [Validators.required])
  });

  private wiFiNetworksSubscription!: Subscription;

  constructor(private deviceService: DeviceService) {}

  ngOnInit(): void {
    console.log('WiFiCredentials INIT');

    this.wiFiNetworksSubscription = this.deviceService.wiFiNetworks$.subscribe((networks) => {

      this.wiFiNetworks = networks;

      if (this.wiFiNetworks.length) {

        this.credentialsForm.get('ssid')?.enable();
        this.credentialsForm.get('password')?.enable();

      } else {

        this.credentialsForm.get('ssid')?.disable();
        this.credentialsForm.get('password')?.disable();

      }

    });
    
  }

  ngOnDestroy(): void {
    this.wiFiNetworksSubscription.unsubscribe();
  }

  async onSubmit() {
    console.log('Form submitted:', this.credentialsForm.value);
    //this.deviceService.sendData(this.credentialsForm.value);
    this.deviceService.asyncSendData(this.credentialsForm.value)
      .then(() => {
        console.log('Data sent successfully');
      })
      .finally(() => {

      });
  }
}
