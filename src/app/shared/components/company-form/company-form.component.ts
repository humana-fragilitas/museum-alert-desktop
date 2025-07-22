import { 
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { finalize, Observable, of, Subscription } from 'rxjs';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CompanyService } from '../../../core/services/company/company.service';
import { ApiResult, DialogType, ErrorApiResponse, SuccessApiResponse, UpdateCompanyRequest, UpdateCompanyResponse } from '../../../core/models';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe, TranslateService, _ } from '@ngx-translate/core';
import { DialogService } from '../../../core/services/dialog/dialog.service';
import { AuthenticationExpiredError } from '../../../core/interceptors/auth-token.interceptor';
import { ErrorService } from '../../../core/services/error/error.service';

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
export class CompanyFormComponent implements OnInit, OnDestroy {

  @ViewChild('companyName', { static: false }) companyNameInput!: ElementRef;

  public isBusy = false;
  public isEditable = false;
  public isCompanyNameSet = true;
  private subscription: Subscription = new Subscription();

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
  ) { }

  ngOnInit(): void {

    console.log('CompanyFormComponent INIT');

    this.subscription = this.companyService.company$.subscribe((company: any) => {

      this.isCompanyNameSet = !!company?.companyName;
      this.companyNameForm.get('companyName')?.setValue(company?.companyName || '');

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

  onSubmit() {

    console.log('[CompanyFormComponent]: company form submitted:', this.companyNameForm.value);

    this.isBusy = true;
    this.companyNameForm.get('companyName')?.disable();

    this.companyService.setName((this.companyNameForm.value as UpdateCompanyRequest))
        .pipe(
          finalize(() => {
            this.isBusy = false;
            this.isEditable = false;
          })
        )
        .subscribe({
          next: (response: ApiResult<UpdateCompanyResponse>) => {
            console.log('[CompanyFormComponent]: company successfully updated:', response);
          },
          error: (error: HttpErrorResponse) => {
            console.error('[CompanyFormComponent]: there was an error while attempting to update company', error);
            this.cancel();
            this.errorService.showModal(error, {
                type: DialogType.ERROR,
                title: 'ERRORS.APPLICATION.COMPANY_UPDATE_FAILED_TITLE',
                message: 'ERRORS.APPLICATION.COMPANY_UPDATE_FAILED_MESSAGE'
              }, { disableClose: true }
            );
          }
        });

  }

  edit() {
    this.isEditable = true;
    this.companyNameForm.get('companyName')?.enable();
    setTimeout(()=>{
      this.companyNameInput.nativeElement.focus();
      this.companyNameInput.nativeElement.select();
    }, 0);
  }

  cancel() {
    this.isEditable = false;
    this.companyNameForm.get('companyName')?.disable();
    this.companyNameForm.get('companyName')?.setValue(this.companyService.currentCompany?.companyName || '');
    setTimeout(() => {
      this.companyNameInput.nativeElement.blur();
    }, 0);
  }

  hasError(error: string): boolean {

    return !!this.companyNameForm.get('companyName')?.hasError(error) &&
           !!this.companyNameForm.get('companyName')?.touched;

  }

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
