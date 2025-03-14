import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';

import { AuthenticatorService, AmplifyAuthenticatorModule } from '@aws-amplify/ui-angular';
import { ProvisioningService } from '../core/services/provisioning/provisioning.service';
import { DeviceService } from '../core/services/device/device.service';

/**
 * humana.fragilitas@gmail.com
 * zZ&c0qIz
 */

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [
    AmplifyAuthenticatorModule
  ],
  encapsulation: ViewEncapsulation.None
})
export class HomeComponent implements OnInit {

  @ViewChild('companyNamePreview', { static: false }) companyNamePreview!: ElementRef;
  public formFields = {
    signUp: {
      ['custom:Company']: {
        isRequired: true
      },
    },
  };

  constructor(
    private router: Router,
    private provisioningService: ProvisioningService,
    private authenticatorService: AuthenticatorService,
    public deviceService: DeviceService
  ) { }

  ngOnInit(): void {
    console.log('HomeComponent INIT');
  }

  createProvisioningClaim() {

    this.provisioningService.createClaim();
  
  }

  signOut() {
    this.authenticatorService.signOut();
  }

  change(event: any) {

    const inputElement = event.target as HTMLInputElement;
  const companyName = inputElement.value;

  // Apply transformation: remove non-alphanumeric, lowercase, replace spaces with hyphens
  this.companyNamePreview.nativeElement.value = companyName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Allow only letters, numbers, spaces, and '-'
    .replace(/\s*-\s*/g, '-') // Ensure '-' has no surrounding spaces
    .replace(/\s+(?=[a-z0-9])/g, '-') // Replace spaces with '-' only if followed by a letter/number
    .replace(/-{2,}/g, '-') // Collapse multiple '-' into one
    .replace(/^-+|-+$/g, ''); // Remove '-' at the start or end

  }

}
 
