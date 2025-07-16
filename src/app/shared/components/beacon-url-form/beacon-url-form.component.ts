import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { beaconUrlValidator } from '../../validators/beacon-url.validator';
import { DeviceConfigurationService } from '../../../core/services/device-configuration/device-configuration.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe, TranslateService, _ } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, Observable, of } from 'rxjs';

 
@Component({
  selector: 'app-beacon-url-form',
  templateUrl: './beacon-url-form.component.html',
  styleUrls: ['./beacon-url-form.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS,
    ...FORM_MATERIAL_IMPORTS,
  ]
})
export class BeaconUrlFormComponent implements OnInit {

  private readonly disabled$: BehaviorSubject<boolean> =
    new BehaviorSubject<boolean>(false);

  @Input()
  set disabled(value: boolean) {
    this.disabled$.next(value);
  }
  @ViewChild('beaconUrl', { static: false }) beaconUrlInput!: ElementRef;

  public isBusy$ = this.deviceConfigurationService.isBusy$;
  public isSubmitting = false;
  public isEditable = false;
  public isBeaconUrlSet = false;

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
    private deviceConfigurationService: DeviceConfigurationService,
    private translateService: TranslateService
  ) {

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

    this.isDisabled$
        .pipe(takeUntilDestroyed())
        .subscribe((disabled) => {
          const beaconUrlField = this.beaconUrlForm.get('beaconUrl');
          if (!disabled) beaconUrlField?.disable();
        });

  }

  ngOnInit(): void {

    console.log('CompanyForm INIT');
    
  }

  async onSubmit() {

    this.isSubmitting = true;

    this.beaconUrlForm.get('beaconUrl')?.disable();

    console.log('Beacon url form submitted:', this.beaconUrlForm.value);

    const beaconUrl = this.beaconUrlForm.value.beaconUrl || '';

    this.deviceConfigurationService.saveSettings({
      beaconUrl
    }).then(() => {
      console.log('Beacon url saved successfully');
    }).catch(() => {
      console.log('Error while saving beacon url');
    }).finally(() => {
      this.isSubmitting = false;
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

  getErrorMessage(): Observable<string> {

    const control = this.beaconUrlForm.get('beaconUrl');

    if (control?.errors) {
      if (control.errors['required']) {
        return this.translateService.get(
          _('COMPONENTS.BEACON_URL_FORM.ERRORS.URL_IS_REQUIRED')
        );
      }
      if (control.errors['url']) {
        return this.translateService.get(
          _('COMPONENTS.BEACON_URL_FORM.ERRORS.URL_IS_INVALID')
        );
      }
      if (control.errors['firstLevelDomain']) {
        const error = control.errors['firstLevelDomain'];
        return this.translateService.get(
          _('COMPONENTS.BEACON_URL_FORM.ERRORS.DOMAIN_IS_INVALID'),
          {
            foundDomain: error.foundDomain,
            allowedDomains: error.allowedDomains.join(', ')
          }
        );
      }
      if (control.errors['eddystoneUrl']) {
        const error = control.errors['eddystoneUrl'];
        return this.translateService.get(
          _('COMPONENTS.BEACON_URL_FORM.ERRORS.URL_IS_TOO_LONG'),
          {
            length: error.encodedLength
          }
        );
      }
    }
    return of('');

  }

  get isDisabled$(): Observable<boolean> {
    return combineLatest([
      this.isBusy$,
      this.disabled$
    ]).pipe(
      map(([isBusy, disabled]) => isBusy || disabled),
      distinctUntilChanged()
    );
  }

}
