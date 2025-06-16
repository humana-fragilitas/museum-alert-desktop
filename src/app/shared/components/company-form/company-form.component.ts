import { Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MqttService } from '../../../core/services/mqtt/mqtt.service';
import { distinctUntilChanged, map, Observable, Subscription } from 'rxjs';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { CompanyService } from '../../../core/services/company/company.service';
import { AuthService } from '../../../core/services/auth/auth.service';

@Component({
  selector: 'app-company-form',
  templateUrl: './company-form.component.html',
  styleUrls: ['./company-form.component.scss'],
  imports: [ ]
})
export class CompanyFormComponent implements OnInit {

  @ViewChild('companyName', { static: false }) companyNameInput!: ElementRef;

  public isBusy = false;
  public isEditable = false;
  public isCompanyNameSet = true;
  private subscription: Subscription = new Subscription();

  companyNameForm = new FormGroup({
    companyName: new FormControl(
      { value: '', disabled: false },
      [Validators.required]
    )
  });

  constructor(
    private companyService: CompanyService,
    private authService: AuthService
  ) {

    this.subscription = this.companyService.company$.subscribe((company) => {

      this.isCompanyNameSet = !!company?.companyName;

      this.companyNameForm.get('companyName')?.disable();

      if (company) {
        this.companyNameForm.get('companyName')?.setValue(company.companyName || '');
      } else {
        this.companyNameForm.get('companyName')?.setValue('');
      }

    });

  }

  ngOnInit(): void {

    console.log('CompanyForm INIT');
    
  }

  ngOnDestroy(): void {

  }

  async onSubmit() {

    this.isBusy = true;
    this.companyNameForm.get('companyName')?.disable();

    console.log('Company form submitted:', this.companyNameForm.value);
    this.companyService.setName(this.companyNameForm.value.companyName || '')
      .subscribe({
        next: () => {
          console.log('Data sent successfully');
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
    this.companyNameInput.nativeElement.focus();
    this.companyNameInput.nativeElement.select();
  }

  cancel() {
    this.isEditable = false;
    this.companyNameForm.get('companyName')?.disable();
    this.companyNameForm.get('companyName')?.setValue(this.companyService.currentCompany?.companyName || '');
    this.companyNameInput.nativeElement.blur();
    setTimeout(() => {
      this.companyNameInput.nativeElement.focus();
    }, 0);
  }

}
