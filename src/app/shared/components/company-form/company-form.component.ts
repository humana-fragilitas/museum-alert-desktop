import { 
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation
} from '@angular/core';
import { Subscription } from 'rxjs';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { CompanyService } from '../../../core/services/company/company.service';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-company-form',
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss'],
  imports: [
    MatButtonModule,
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule
  ],
  encapsulation: ViewEncapsulation.None,
})
export class CompanyFormComponent implements OnInit, OnDestroy, AfterViewInit {

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
    private companyService: CompanyService
  ) { }

  ngOnInit(): void {

    console.log('CompanyForm INIT');

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

  ngAfterViewInit(): void {

 
    
  }

  async onSubmit() {

    this.isBusy = true;
    this.companyNameForm.get('companyName')?.disable();

    console.log('Company form submitted:', this.companyNameForm.value);
    this.companyService.setName(this.companyNameForm.value.companyName || '')
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
    this.companyNameForm.get('companyName')?.enable();
    setTimeout(()=>{
      this.companyNameInput.nativeElement.focus();
      this.companyNameInput.nativeElement.select();
    });
  }

  cancel() {
    this.isEditable = false;
    this.companyNameForm.get('companyName')?.disable();
    this.companyNameForm.get('companyName')?.setValue(this.companyService.currentCompany?.companyName || '');
    setTimeout(() => {
      this.companyNameInput.nativeElement.blur();
    }, 0);
  }

}
