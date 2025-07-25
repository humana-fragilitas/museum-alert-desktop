import { finalize, Observable, of } from 'rxjs';
import { TranslatePipe, TranslateService, _ } from '@ngx-translate/core';

import { 
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  ViewEncapsulation,
  signal,
  computed,
  effect
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';

import { CompanyService } from '@services/company/company.service';
import { ApiResult, DialogType, ErrorApiResponse, UpdateCompanyRequest, UpdateCompanyResponse } from '@models/.';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '@shared/utils/material-imports';
import { DialogService } from '@services/dialog/dialog.service';
import { ErrorService } from '@services/error/error.service';


@Component({
  selector: 'app-company-form',
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS,
    ...FORM_MATERIAL_IMPORTS
  ],
  encapsulation: ViewEncapsulation.None,
})
export class CompanyFormComponent implements OnInit {

  @ViewChild('companyName', { static: false }) companyNameInput!: ElementRef;

  // 🔥 MIGRATED TO SIGNALS - Component State
  public readonly isBusy = signal(false);
  public readonly isEditable = signal(false);
  public readonly isCompanyNameSet = signal(true);

  // 🔥 MIGRATED TO SIGNALS - Service observable converted to signal
  private readonly company = this.companyService.company;

  // 🔥 COMPUTED SIGNALS - Derived state (matching original behavior)
  public readonly showSubmitButton = computed(() => 
    !this.isCompanyNameSet() || this.isEditable()
  );

  public readonly showEditButton = computed(() => 
    this.isCompanyNameSet() && !this.isEditable()
  );

  public readonly showCancelButton = computed(() => 
    this.isEditable()
  );

  companyNameForm = new FormGroup({
    companyName: new FormControl(
      { value: '', disabled: false },
      [
        Validators.required,
        Validators.minLength(3),
        Validators.maxLength(50),
        Validators.pattern(/^[a-zA-Z0-9\s\-\u00C0-\u017F\u0100-\u024F'&.,()]+$/)
      ]
    )
  });

  constructor(
    private companyService: CompanyService,
    private translateService: TranslateService,
    private dialogService: DialogService,
    private readonly errorService: ErrorService
  ) {
    // 🔥 EFFECT - Handle company data changes
    effect(() => {
      const company = this.company();
      if (company) {
        const hasCompanyName = !!company?.companyName;
        this.isCompanyNameSet.set(hasCompanyName);
        this.companyNameForm.get('companyName')?.setValue(company?.companyName || '');

        if (hasCompanyName) {
          this.cancel();
        } else {
          this.edit();
        }
      }
    });
  }

  ngOnInit(): void {
    console.log('CompanyFormComponent INIT');
  }

  onSubmit() {
    console.log('[CompanyFormComponent]: company form submitted:', this.companyNameForm.value);

    this.isBusy.set(true);
    this.companyNameForm.get('companyName')?.disable();

    this.companyService.setName((this.companyNameForm.value as UpdateCompanyRequest))
        .pipe(
          finalize(() => {
            this.isBusy.set(false);
            this.isEditable.set(false);
          }),
        )
        .subscribe({
          next: (response: ApiResult<UpdateCompanyResponse>) => {
            console.log('[CompanyFormComponent]: company successfully updated:', response);
          },
          error: (exception: HttpErrorResponse) => {
            console.error('[CompanyFormComponent]: there was an error while attempting to update company', exception.error as ErrorApiResponse);
            this.cancel();
            this.errorService.showModal({
              exception,
              data: {
                type: DialogType.ERROR,
                title: 'ERRORS.APPLICATION.COMPANY_UPDATE_FAILED_TITLE',
                message: 'ERRORS.APPLICATION.COMPANY_UPDATE_FAILED_MESSAGE'
              },
              dialogConfig: { disableClose: true }
            });
          }
        });
  }

  edit() {
    this.isEditable.set(true);
    this.companyNameForm.get('companyName')?.enable();
    setTimeout(() => {
      this.companyNameInput.nativeElement.focus();
      this.companyNameInput.nativeElement.select();
    }, 0);
  }

  cancel() {
    this.isEditable.set(false);
    this.companyNameForm.get('companyName')?.disable();
    this.companyNameForm.get('companyName')?.setValue(this.companyService.organization()?.companyName || '');
    setTimeout(() => {
      this.companyNameInput.nativeElement.blur();
    }, 0);
  }

  hasError(error: string): boolean {
    return !!this.companyNameForm.get('companyName')?.hasError(error) &&
           !!this.companyNameForm.get('companyName')?.touched;
  }

  // 🚫 KEEP AS OBSERVABLE - Complex form validation with translation
  getErrorMessage(): Observable<string> {
    const control = this.companyNameForm.get('companyName');

    if (control?.errors) {
      if (control.errors['required']) {
        return this.translateService.get(
          _('COMPONENTS.COMPANY_FORM.ERRORS.NAME_IS_REQUIRED')
        );
      }
      if (control.errors['minlength']) {
        return this.translateService.get(
          _('COMPONENTS.COMPANY_FORM.ERRORS.NAME_IS_TOO_SHORT'),
        );
      }
      if (control.errors['maxlength']) {
        return this.translateService.get(
          _('COMPONENTS.COMPANY_FORM.ERRORS.NAME_IS_TOO_LONG'),
        );
      }
      if (control.errors['pattern']) {
        return this.translateService.get(
          _('COMPONENTS.COMPANY_FORM.ERRORS.NAME_DOES_NOT_MATCH_PATTERN')
        );
      }
    }
    
    return of('');
  }
}