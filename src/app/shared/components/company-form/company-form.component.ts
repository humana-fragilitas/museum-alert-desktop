import { Component, Input, OnDestroy, OnInit } from '@angular/core';
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

  public isBusy = false;

  companyNameForm = new FormGroup({
    companyName: new FormControl(
      { value: '', disabled: false },
      [Validators.required]
    )
  });

  constructor(
    private companyService: CompanyService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {

    console.log('CompanyForm INIT');
    
  }

  ngOnDestroy(): void {

  }

  async onSubmit() {

    this.isBusy = true;

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
        }
      });

  }

}
