import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { CompanyFormComponent } from './company-form.component';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { CompanyService } from '@services/company/company.service';
import { DialogService } from '@services/dialog/dialog.service';
import { ErrorService } from '@services/error/error.service';
import { TranslateModule } from '@ngx-translate/core';
import { HttpClientTestingModule } from '@angular/common/http/testing';

const mockCompanySignal = signal<any>({ companyName: 'TestOrg' });
const mockOrganizationSignal = signal<any>({ companyName: 'TestOrg' });

const mockCompanyService = {
  company: mockCompanySignal,
  organization: mockOrganizationSignal,
  setName: jest.fn(() => of({ result: { companyName: 'TestOrg' } }))
};
const mockDialogService = { openDialog: jest.fn() };
const mockErrorService = { showModal: jest.fn() };

describe('CompanyFormComponent', () => {
  let fixture: ComponentFixture<CompanyFormComponent>;
  let component: CompanyFormComponent;
  let consoleSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        CompanyFormComponent,
        TranslateModule.forRoot(),
        HttpClientTestingModule
      ],
      providers: [
        { provide: CompanyService, useValue: mockCompanyService },
        { provide: DialogService, useValue: mockDialogService },
        { provide: ErrorService, useValue: mockErrorService }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(CompanyFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the company name input', () => {
    const input = fixture.debugElement.query(By.css('input[formControlName="companyName"]'));
    expect(input).toBeTruthy();
  });

  it('should disable submit button if form is invalid', () => {
    // Ensure company name is not set so submit button appears
    mockCompanySignal.set({ companyName: '' });
    mockOrganizationSignal.set({ companyName: '' });
    component.isEditable.set(true);
    component.companyNameForm.get('companyName')?.setValue('');
    component.companyNameForm.get('companyName')?.markAsTouched();
    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn?.nativeElement.disabled).toBe(true);
  });

  it('should enable submit button if form is valid and editable', () => {
    component.isEditable.set(true);
    component.companyNameForm.get('companyName')?.setValue('ValidName');
    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    expect(submitBtn.nativeElement.disabled).toBe(false);
  });

  it('should call onSubmit and setName on submit', fakeAsync(() => {
    component.isEditable.set(true);
    component.companyNameForm.get('companyName')?.setValue('ValidName');
    fixture.detectChanges();
    const submitBtn = fixture.debugElement.query(By.css('button[type="submit"]'));
    submitBtn.nativeElement.click();
    tick();
    expect(mockCompanyService.setName).toHaveBeenCalledWith({ companyName: 'ValidName' });
    expect(consoleSpy).toHaveBeenCalledWith('[CompanyFormComponent]: company form submitted:', expect.any(Object));
    expect(consoleSpy).toHaveBeenCalledWith('[CompanyFormComponent]: company successfully updated:', expect.any(Object));
  }));

  it('should call dialogService.openDialog on error', fakeAsync(() => {
    // Simulate error by returning an observable that errors
    const { throwError } = require('rxjs');
    mockCompanyService.setName.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.isEditable.set(true);
    component.companyNameForm.get('companyName')?.setValue('FailName');
    fixture.detectChanges();
    component.onSubmit();
    tick();
    expect(mockDialogService.openDialog).toHaveBeenCalled();
  }));

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('CompanyFormComponent INIT');
  });

  it('should show error message when form is invalid', fakeAsync(() => {
    // Ensure company name is not set so form is in edit mode  
    mockCompanySignal.set({ companyName: '' });
    mockOrganizationSignal.set({ companyName: '' });
    component.isEditable.set(true);
    component.companyNameForm.get('companyName')?.setValue('');
    component.companyNameForm.get('companyName')?.markAsTouched();
    fixture.detectChanges();
    tick();
    const error = fixture.debugElement.query(By.css('mat-error'));
    // The error should show when form is invalid and touched
    expect(error).toBeTruthy();
    if (error) {
      expect(error.nativeElement.textContent).toBeTruthy();
    }
  }));

  it('should call edit() and focus/select input', fakeAsync(() => {
    const focusSpy = jest.fn();
    const selectSpy = jest.fn();
    component.companyNameInput = { nativeElement: { focus: focusSpy, select: selectSpy } } as any;
    component.edit();
    tick();
    expect(component.isEditable()).toBe(true);
    expect(focusSpy).toHaveBeenCalled();
    expect(selectSpy).toHaveBeenCalled();
  }));

  it('should call cancel() and blur input', fakeAsync(() => {
    const blurSpy = jest.fn();
    component.companyNameInput = { nativeElement: { blur: blurSpy } } as any;
    component.cancel();
    tick();
    expect(component.isEditable()).toBe(false);
    expect(blurSpy).toHaveBeenCalled();
  }));
});
