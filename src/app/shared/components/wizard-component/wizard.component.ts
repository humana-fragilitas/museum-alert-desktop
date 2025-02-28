import { Component, OnInit } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss'],
  imports: [ WiFiCredentialsComponent ],
})
export class WizardComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {
    console.log('WizardComponent INIT');
  }

}
