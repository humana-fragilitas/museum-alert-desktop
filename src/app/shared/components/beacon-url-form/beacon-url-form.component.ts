import { AfterViewInit, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MqttService } from '../../../core/services/mqtt/mqtt.service';
import { distinctUntilChanged, map, Observable, Subscription } from 'rxjs';
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

  public isBusy = false;
  public isEditable = false;
  public isCompanyNameSet = true;
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
    private authService: AuthService
  ) { }

  ngOnInit(): void {

    console.log('CompanyForm INIT');

    this.subscription = this.companyService.company$.subscribe((company: any) => {

      this.isCompanyNameSet = !!company?.companyName;
      this.beaconUrlForm.get('beaconUrl')?.setValue(company?.beaconUrl || '');

      if (this.isCompanyNameSet) {
        this.cancel();
      } else {
        this.edit();
      }

    });
    
  }

  ngOnDestroy(): void {

    this.subscription.unsubscribe();

  }

  async onSubmit() {

    this.isBusy = true;
    this.beaconUrlForm.get('companyName')?.disable();

    console.log('Company form submitted:', this.beaconUrlForm.value);
    this.companyService.setName(this.beaconUrlForm.value.beaconUrl || '')
      .subscribe({
        next: () => {
          console.log('Data sxent successfully');
        },
        error: (error) => {
          console.error('Error sending data:', error);
        },
        complete: () => {
          this.isBusy = false;
          this.isEditable = false;
          this.companyService.get().subscribe();

        }
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
    this.beaconUrlForm.get('beaconUrl')?.setValue(this.companyService.currentCompany?.companyName || '');
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
