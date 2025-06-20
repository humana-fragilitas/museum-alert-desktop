import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CompanyService } from '../../../core/services/company/company.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { beaconUrlValidator } from '../../validators/beacon-url.validator';
import { DeviceConfigurationService } from '../../../core/services/device-configuration/device-configuration.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
 
@Component({
  selector: 'app-beacon-url-form',
  templateUrl: './beacon-url-form.component.html',
  styleUrls: ['./beacon-url-form.component.scss'],
  imports: [
      MatButtonModule,
      CommonModule,
      MatFormFieldModule,
      MatInputModule,
      MatIconModule,
      ReactiveFormsModule,
      MatProgressSpinnerModule
    ]
})
export class BeaconUrlFormComponent implements OnInit, OnDestroy {

  @ViewChild('beaconUrl', { static: false }) beaconUrlInput!: ElementRef;

  public isBusy$ = this.deviceConfigurationService.isBusy$;
  public isEditable = false;
  public isBeaconUrlSet = false;
  private subscription: Subscription = new Subscription();

  beaconUrlForm = new FormGroup({
    beaconUrl: new FormControl(
      { value: '', disabled: false },
      [
        Validators.required,
        beaconUrlValidator()
      ]
    )
  });

  constructor(
    private companyService: CompanyService,
    private authService: AuthService,
    private deviceConfigurationService: DeviceConfigurationService
  ) {

    setTimeout(() => { this.deviceConfigurationService.loadSettings().finally(); }, 2000);

    this.deviceConfigurationService
        .settings$
        .pipe(takeUntilDestroyed())
        .subscribe((configuration) => {
      if (configuration) {
        this.isBeaconUrlSet = !!configuration.beaconUrl;
        this.beaconUrlForm.get('beaconUrl')?.setValue(configuration.beaconUrl || '');
        if (this.isBeaconUrlSet) {
          this.cancel();
        } else {
          this.edit();
        }
      }
    });

  }

  ngOnInit(): void {

    console.log('CompanyForm INIT');
    
  }

  ngOnDestroy(): void {

    this.subscription.unsubscribe();

  }

  async onSubmit() {

    this.beaconUrlForm.get('beaconUrl')?.disable();

    console.log('Beacon url form submitted:', this.beaconUrlForm.value);

    const beaconUrl = this.beaconUrlForm.value.beaconUrl || '';

    this.deviceConfigurationService.saveSettings({
      beaconUrl
    }).then(() => {
      console.log('Beacon url saved successfully');
    }).catch(() => {
      console.log('Error while saving beacon url');
    });

  }

  edit() {
    this.isEditable = true;
    this.beaconUrlForm.get('beaconUrl')?.enable();
    setTimeout(()=>{
      this.beaconUrlInput.nativeElement.focus();
      this.beaconUrlInput.nativeElement.select();
    });
  }

  cancel() {
    this.isEditable = false;
    this.beaconUrlForm.get('beaconUrl')?.disable();
    this.beaconUrlForm.get('beaconUrl')?.setValue(
      this.deviceConfigurationService
          .settings
          ?.beaconUrl || ''
    );
    setTimeout(() => {
      this.beaconUrlInput.nativeElement.blur();
    }, 0);
  }

  getErrorMessage(): string {
      const control = this.beaconUrlForm.get('beaconUrl');
      if (control?.errors) {
        if (control.errors['required']) {
          return 'URL is required';
        }
        if (control.errors['url']) {
          return `Invalid URL: ${control.errors['url'].error}`;
        }
        if (control.errors['firstLevelDomain']) {
          const error = control.errors['firstLevelDomain'];
          return `Invalid domain "${error.foundDomain}". Allowed domains: ${error.allowedDomains.join(', ')}`;
        }
        if (control.errors['eddystoneUrl']) {
          const error = control.errors['eddystoneUrl'];
          return `${error.error}`;
        }
      }
      return '';
    }

}
