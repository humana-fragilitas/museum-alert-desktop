import { 
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { finalize, Subscription } from 'rxjs';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CompanyService } from '../../../core/services/company/company.service';
import { UpdateCompanyRequest } from '../../../core/models';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../core/services/notification/notification.service';
import { AppErrorType, ErrorType } from '../../../../../app/shared/models';
import { HttpErrorResponse } from '@angular/common/http';
import { COMMON_MATERIAL_IMPORTS, FORM_MATERIAL_IMPORTS } from '../../utils/material-imports';

@Component({
  selector: 'app-company-form',
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    private notificationService: NotificationService
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

  async onSubmit() {

    this.isBusy = true;
    this.companyNameForm.get('companyName')?.disable();

    console.log('Company form submitted:', this.companyNameForm.value);

    this.companyService.setName(
      (this.companyNameForm.value as UpdateCompanyRequest) 
    )
    .pipe(
      finalize(() => {
        this.isBusy = false;
        this.isEditable = false;
      })
    )
    .subscribe({
      error: (error: HttpErrorResponse) => {
        this.cancel();
        this.notificationService.onError(
          ErrorType.APP_ERROR,
          AppErrorType.FAILED_COMPANY_UPDATE,
          error
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

}
