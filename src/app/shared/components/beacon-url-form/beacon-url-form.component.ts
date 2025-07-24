import { TranslatePipe, TranslateService, _ } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

import { Component, ElementRef, Input, OnInit, ViewChild, computed, signal, effect } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';

import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { beaconUrlValidator } from '@validators/beacon-url.validator';
import { DeviceConfigurationService } from '@services/device-configuration/device-configuration.service';
import { DialogService } from '@services/dialog/dialog.service';
import { DialogType } from '@models/ui.models';


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

  // 🔥 MIGRATED TO SIGNALS - Component State
  private readonly isDisabled = signal<boolean>(false);
  private readonly isSubmitting = signal<boolean>(false);
  private readonly isEditMode = signal<boolean>(false);
  private readonly isBeaconUrlSet = signal<boolean>(false);

  // 🔥 MIGRATED TO SIGNALS - Service observables converted to signals
  public readonly isBusy = this.deviceConfigurationService.isBusy;
  private readonly deviceProperties = this.deviceConfigurationService.properties;

  @Input()
  set disabled(value: boolean) {
    this.isDisabled.set(value);
  }

  @ViewChild('beaconUrl', { static: false }) beaconUrlInput!: ElementRef;

  // 🔥 COMPUTED SIGNALS - Replace complex observables with computed
  public readonly isEnabled = computed(() => 
    !this.isBusy() && !this.isDisabled()
  );

  public readonly beaconUrlFieldIsDisabled = computed(() => {
    const isEditMode = this.isEditMode();
    const disabled = this.isDisabled();
    const busy = this.isBusy();
    console.log(`Is in edit mode: ${isEditMode}; disabled ${disabled}`);
    return !isEditMode || disabled || busy;
  });

  public readonly submitButtonVisible = computed(() => {
    const isEditMode = this.isEditMode();
    const disabled = this.isDisabled();
    const busy = this.isBusy();
    console.log(`Is in edit mode: ${isEditMode}; disabled ${disabled}`);
    return isEditMode && !disabled && !busy;
  });

  // 🔥 EXPOSE READONLY SIGNALS FOR TEMPLATE
  public readonly isEditMode$ = this.isEditMode.asReadonly();
  public readonly isSubmitting$ = this.isSubmitting.asReadonly();
  public readonly isEnabled$ = this.isEnabled;
  public readonly beaconUrlFieldIsDisabled$ = this.beaconUrlFieldIsDisabled;

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

    // 🔥 EFFECT - Handle device configuration changes
    effect(() => {
      const configuration = this.deviceProperties();
      if (configuration) {
        this.beaconUrlForm.get('beaconUrl')?.setValue(configuration.beaconUrl || '');
        const hasBeaconUrl = !!configuration.beaconUrl;
        this.isBeaconUrlSet.set(hasBeaconUrl);
        if (hasBeaconUrl) {
          this.cancel();
        } else {
          this.edit();
        }
      }
    });

    // 🔥 EFFECT - Handle form field enable/disable
    effect(() => {
      const disabled = this.beaconUrlFieldIsDisabled();
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

    this.isSubmitting.set(true);
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
      this.isSubmitting.set(false);
    }
  }

  edit() {
    this.isEditMode.set(true);
    setTimeout(() => {
      this.beaconUrlInput.nativeElement.focus();
      this.beaconUrlInput.nativeElement.select();
    });
  }

  cancel() {
    this.isEditMode.set(false);
    this.beaconUrlForm.get('beaconUrl')?.setValue(
      this.deviceConfigurationService.settings()?.beaconUrl || ''
    );
    setTimeout(() => {
      this.beaconUrlInput.nativeElement.blur();
    }, 0);
  }

  // 🚫 KEEP AS OBSERVABLE - Complex form validation logic
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
}