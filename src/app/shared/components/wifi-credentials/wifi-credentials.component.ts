import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { DeviceService } from '../../../../app/core/services/device.service';
import { WiFiNetwork } from '@shared/models';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-wifi-credentials',
  templateUrl: './wifi-credentials.component.html',
  styleUrls: ['./wifi-credentials.component.scss'],
  imports: [],
})
export class WiFiCredentialsComponent implements OnInit, OnDestroy {

  public wiFiNetworks: WiFiNetwork[] = [];

  credentialsForm = new FormGroup({
    ssid: new FormControl({ value: '', disabled: true }, [Validators.required]),
    password: new FormControl({ value: '', disabled: true }, [Validators.required])
  });

  private wiFiNetworksSubscription: Subscription;

  constructor(private deviceService: DeviceService) {

    this.wiFiNetworksSubscription =
        deviceService.wiFiNetworks$.subscribe((networks) => {
          this.wiFiNetworks = networks;
          if (this.wiFiNetworks.length)
            {
              this.credentialsForm.get('ssid')?.enable();
              this.credentialsForm.get('password')?.enable();
            }
        });

  }

  ngOnInit(): void {
    console.log('WiFiCredentials INIT');
    this.credentialsForm.get('ssid')?.disable();
  }

  ngOnDestroy(): void { 

    this.wiFiNetworksSubscription.unsubscribe();

  } 

  onSubmit() {
    console.log('Form submitted:', this.credentialsForm.value);
   this.deviceService.sendData(this.credentialsForm.value);
  }

}
