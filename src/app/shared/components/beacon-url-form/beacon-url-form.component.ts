import { TranslatePipe,
         TranslateService,
         _ } from '@ngx-translate/core';
import { Observable,
         of } from 'rxjs';

import { Component,
         ElementRef,
         Input,
         OnInit,
         ViewChild,
         computed,
         signal,
         effect } from '@angular/core';
import { FormControl,
         FormGroup,
         ReactiveFormsModule,
         Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { COMMON_MATERIAL_IMPORTS,
         FORM_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
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

  private readonly isDisabledSignal = signal<boolean>(false);
  private readonly isSubmittingSignal = signal<boolean>(false);
  private readonly isEditModeSignal = signal<boolean>(false);
  private readonly isBeaconUrlSetSignal = signal<boolean>(false);
  private readonly devicePropertiesSignal = this.deviceConfigurationService.settings;

  readonly isBusy = this.deviceConfigurationService.isBusy;
  readonly isEditMode = this.isEditModeSignal.asReadonly();
  readonly isSubmitting = this.isSubmittingSignal.asReadonly();
  readonly isEnabled = computed(() => 
    !this.isBusy() && !this.isDisabledSignal()
  );
  readonly beaconUrlFieldIsDisabled = computed(() => {
    const isEditMode = this.isEditModeSignal();
    const disabled = this.isDisabledSignal();
    const busy = this.isBusy();
    console.log(`Is in edit mode: ${isEditMode}; disabled ${disabled}`);
    return !isEditMode || disabled || busy;
  });
  readonly submitButtonVisible = computed(() => {
    const isEditMode = this.isEditModeSignal();
    const disabled = this.isDisabledSignal();
    const busy = this.isBusy();
    console.log(`Is in edit mode: ${isEditMode}; disabled ${disabled}`);
    return isEditMode && !disabled && !busy;
  });

  @Input()
  set disabled(value: boolean) {
    this.isDisabledSignal.set(value);
  }
  @ViewChild('beaconUrl', { static: false }) beaconUrlInput!: ElementRef;

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

    // Handle device configuration changes
    effect(() => {
      const configuration = this.devicePropertiesSignal();
      if (configuration) {
        this.beaconUrlForm.get('beaconUrl')?.setValue(configuration.beaconUrl || '');
        const hasBeaconUrl = !!configuration.beaconUrl;
        this.isBeaconUrlSetSignal.set(hasBeaconUrl);
        if (hasBeaconUrl) {
          this.cancel();
        } else {
          this.edit();
        }
      }
    });

    //  Handle form field enable/disable
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

    this.isSubmittingSignal.set(true);
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
      });
    } finally {
      this.isSubmittingSignal.set(false);
    }
  }

  edit() {
    this.isEditModeSignal.set(true);
    setTimeout(() => {
      this.beaconUrlInput.nativeElement.focus();
      this.beaconUrlInput.nativeElement.select();
    });
  }

  cancel() {
    this.isEditModeSignal.set(false);
    this.beaconUrlForm.get('beaconUrl')?.setValue(
      this.deviceConfigurationService.settings()?.beaconUrl || ''
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

}