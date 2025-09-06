import { TranslateModule } from '@ngx-translate/core';
import { AuthenticatorService } from '@aws-amplify/ui-angular';

import { TestBed,
         ComponentFixture } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { CompanyService } from '@services/company/company.service';
import { AuthService } from '@services/auth/auth.service';
import { NavBarComponent } from './nav-bar.component';


describe('NavBarComponent', () => {

  let fixture: ComponentFixture<NavBarComponent>;
  let component: NavBarComponent;
  let mockCompanyService: any;
  let mockAuthService: any;
  let mockAuthenticatorService: { signOut: jest.Mock };
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockCompanyService = { isFetchingCompany: signal(false) };
    mockAuthService = { userAttributes: signal({ email: 'user@example.com' }) };
    mockAuthenticatorService = { signOut: jest.fn() };
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        NavBarComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: CompanyService, useValue: mockCompanyService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AuthenticatorService, useValue: mockAuthenticatorService },
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(NavBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('[NavBarComponent]: INIT');
  });

  it('should have user attributes from mock', () => {
    expect(component.userAttributes()).toEqual({ email: 'user@example.com' });
  });

  it('should render user email', () => {
    expect(component.userAttributes()).toEqual({ email: 'user@example.com' });
    expect(component.userAttributes()?.email).toBe('user@example.com');
  });

  it('should show spinner when isFetchingCompany is true', () => {
    mockCompanyService.isFetchingCompany.set(true);
    fixture.detectChanges();
    const spinner = fixture.debugElement.query(By.css('.auth-user-email--spinner'));
    expect(spinner).toBeTruthy();
    const icon = fixture.debugElement.query(By.css('mat-icon[matChipAvatar]'));
    expect(icon).toBeNull();
  });

  it('should show icon when isFetchingCompany is false', () => {
    mockCompanyService.isFetchingCompany.set(false);
    fixture.detectChanges();
    const icon = fixture.debugElement.query(By.css('mat-icon[matChipAvatar]'));
    expect(icon).toBeTruthy();
  });

  it('should call signOut on button click', () => {
    const signOutBtn = fixture.debugElement.query(By.css('button[color="primary"]'));
    signOutBtn.nativeElement.click();
    expect(mockAuthenticatorService.signOut).toHaveBeenCalled();
  });

});
