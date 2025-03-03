import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
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
    ssid: new FormControl(''),
    password: new FormControl('')
  });

  private wiFiNetworksSubscription: Subscription;

  constructor(private deviceService: DeviceService) {

    this.wiFiNetworksSubscription =
        deviceService.wiFiNetworks$.subscribe((networks) => {
          this.wiFiNetworks = networks;
        });

  }

  ngOnInit(): void {
    console.log('WiFiCredentials INIT');
  }

  ngOnDestroy(): void { 

    this.wiFiNetworksSubscription.unsubscribe();

  } 

  onSubmit() {
    console.log('Form submitted:', this.credentialsForm.value);
  }

}
