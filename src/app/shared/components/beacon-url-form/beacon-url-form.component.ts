import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { beaconUrlValidator } from '../../validators/beacon-url.validator';
import { DeviceConfigurationService } from '../../../core/services/device-configuration/device-configuration.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe, TranslateService, _ } from '@ngx-translate/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, Observable, of } from 'rxjs';
import { DialogService } from '../../../core/services/dialog/dialog.service';
import { DialogType } from '../../../core/models/ui.models';

 
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

  private readonly isDisabled: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private readonly isSubmitting: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private readonly isEditMode: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
  private readonly isBeaconUrlSet: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  @Input()
  set disabled(value: boolean) {
    this.isDisabled.next(value);
  }
  @ViewChild('beaconUrl', { static: false }) beaconUrlInput!: ElementRef;

  public isBusy$ = this.deviceConfigurationService.isBusy$;
  public isDisabled$: Observable<boolean> = this.isDisabled.asObservable();
  public isSubmitting$: Observable<boolean> = this.isSubmitting.asObservable();
  public isEditMode$: Observable<boolean> = this.isEditMode.asObservable();
  public isBeaconUrlSet$: Observable<boolean> = this.isBeaconUrlSet.asObservable();

  public beaconUrlForm = new FormGroup({
    beaconUrl: new FormControl(
      { value: '', disabled: false },
      [
        Validators.required,
        beaconUrlValidator()
      ]
    )
  });

  constructor(
    private readonly deviceConfigurationService: DeviceConfigurationService,
    private readonly translateService: TranslateService,
    private readonly dialogService: DialogService
  ) {

    this.deviceConfigurationService
        .properties$
        .pipe(takeUntilDestroyed())
        .subscribe((configuration) => {
          if (configuration) {
            this.beaconUrlForm.get('beaconUrl')?.setValue(configuration.beaconUrl || '');
            const hasBeaconUrl = !!configuration.beaconUrl;
            this.isBeaconUrlSet.next(hasBeaconUrl);
            if (hasBeaconUrl) {
              this.cancel();
            } else {
              this.edit();
            }
          }
        });
    
    this.beaconUrlFieldIsDisabled$
        .pipe(takeUntilDestroyed())
        .subscribe((disabled) => {
          const beaconUrlField = this.beaconUrlForm.get('beaconUrl');
          if (disabled) {
            beaconUrlField?.disable();
          } else {
            beaconUrlField?.enable();
          }
        });

  }

  ngOnInit(): void {

    console.log('[BeaconUrlFormComponent] ngOnInit');
    
  }

  async onSubmit() {

    console.log('[BeaconUrlFormComponent]: beacon url form submitted:', this.beaconUrlForm.value);

    this.isSubmitting.next(true);
    this.beaconUrlForm.get('beaconUrl')?.disable();
    const beaconUrl = this.beaconUrlForm.value.beaconUrl!;

    try {
      await this.deviceConfigurationService.saveSettings({beaconUrl});
      console.log('[BeaconUrlFormComponent]: beacon url saved successfully');
    } catch (error) {
      console.log('[BeaconUrlFormComponent]: error while saving beacon url');
      this.dialogService.openDialog({
        type: DialogType.ERROR,
        title: 'ERRORS.APPLICATION.DEVICE_CONFIGURATION_UPDATE_FAILED_TITLE',
        message: 'ERRORS.APPLICATION.DEVICE_CONFIGURATION_UPDATE_FAILED_MESSAGE'
      }, { disableClose: true });
    } finally {
      this.isSubmitting.next(false);
    }

  }

  edit() {
    this.isEditMode.next(true);
    setTimeout(()=>{
      this.beaconUrlInput.nativeElement.focus();
      this.beaconUrlInput.nativeElement.select();
    });
  }

  cancel() {
    this.isEditMode.next(false);
    this.beaconUrlForm.get('beaconUrl')?.setValue(
      this.deviceConfigurationService
          .settings
          ?.beaconUrl || ''
    );
    setTimeout(() => {
      this.beaconUrlInput.nativeElement.blur();
    }, 0);
  }

  get errorMessage$(): Observable<string> {

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

  get isEnabled$(): Observable<boolean> {
    return combineLatest([
      this.isBusy$,
      this.isDisabled$
    ]).pipe(
      map(([isBusy, disabled]) => !isBusy && !disabled),
      distinctUntilChanged()
    );
  }

  get beaconUrlFieldIsDisabled$(): Observable<boolean> {
    return combineLatest([
      this.isEditMode$,
      this.isDisabled$,
      this.isBusy$
    ]).pipe(
      map(([isEditMode, disabled, busy]) => {
        console.log(`Is in edit mode: ${isEditMode}; disabled ${disabled}`);
        return !isEditMode || disabled || busy;
      }),
      distinctUntilChanged()
    );
  }

  get submitButtonVisible$(): Observable<boolean> {
    return combineLatest([
      this.isEditMode$,
      this.isDisabled$,
      this.isBusy$
    ]).pipe(
      map(([isEditMode, disabled, busy]) => {
        console.log(`Is in edit mode: ${isEditMode}; disabled ${disabled}`);
        return !isEditMode || disabled || busy;
      }),
      distinctUntilChanged()
    );
  }

}
