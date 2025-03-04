import { Component, OnInit } from '@angular/core';
import { WiFiCredentialsComponent } from '../wifi-credentials/wifi-credentials.component';
import { ProvisioningService } from '../../../core/services/provisioning.service';

@Component({
  selector: 'app-wizard',
  templateUrl: './wizard.component.html',
  styleUrls: ['./wizard.component.scss'],
  imports: [ WiFiCredentialsComponent ],
})
export class WizardComponent implements OnInit {

  constructor(private provisioningService: ProvisioningService) {}

  ngOnInit(): void {
    console.log('WizardComponent INIT');
  }

  createProvisioningClaim() {

    this.provisioningService.createClaim();
  
  }

}
