import { Component, OnInit } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { DeviceService } from '../../../../app/core/services/device.service';

@Component({
  selector: 'app-wifi-credentials',
  templateUrl: './wifi-credentials.component.html',
  styleUrls: ['./wifi-credentials.component.scss'],
  imports: [],
})
export class WiFiCredentialsComponent implements OnInit {

  credentialsForm = new FormGroup({
    ssid: new FormControl(''),
    password: new FormControl('')
  });

  constructor(public deviceService: DeviceService) {}

  ngOnInit(): void {
    console.log('WiFiCredentials INIT');
  }

  onSubmit() {
    console.log('Form submitted:', this.credentialsForm.value);
  }

}
