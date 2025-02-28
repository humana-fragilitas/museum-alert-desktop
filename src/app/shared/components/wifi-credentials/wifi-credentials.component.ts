import { Component, OnInit } from '@angular/core';
import { SharedModule } from '../../shared.module';
import { FormGroup, FormControl } from '@angular/forms';

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

  constructor() {}

  ngOnInit(): void {
    console.log('WiFiCredentials INIT');
  }

  onSubmit() {
    console.log('Form submitted:', this.credentialsForm.value);
  }

}
