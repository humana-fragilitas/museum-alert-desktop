import { TestBed, ComponentFixture } from '@angular/core/testing';
import { ProfileComponent } from './profile.component';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CompanyService } from '@services/company/company.service';
import { AuthService } from '@services/auth/auth.service';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

// Mock signals for company and loginId
const mockCompany = signal<any>({ companyName: 'TestOrg', members: [{ email: 'user@example.com', role: 'admin', joinedAt: new Date() }] });
const mockLoginId = signal('user@example.com');

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let consoleSpy: jest.SpyInstance;

  beforeEach(async () => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [
        ProfileComponent,
        RouterTestingModule,
        TranslateModule.forRoot(),
        NoopAnimationsModule
      ],
      providers: [
        { provide: CompanyService, useValue: { 
          organization: mockCompany,
          company: mockCompany 
        } },
        { provide: AuthService, useValue: { userLoginId: mockLoginId } },
        TranslateService
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render the back button with correct link', () => {
    const backBtn = fixture.debugElement.query(By.css('a.back-button'));
    expect(backBtn).toBeTruthy();
    expect(backBtn.attributes['ng-reflect-router-link']).toContain('/device');
  });

  it('should render the company form', () => {
    const form = fixture.debugElement.query(By.css('app-company-form'));
    expect(form).toBeTruthy();
  });

  it('should render the members table if company has members', () => {
    const table = fixture.debugElement.query(By.css('table[mat-table]'));
    expect(table).toBeTruthy();
    const rows = table.queryAll(By.css('tr[mat-row]'));
    expect(rows.length).toBeGreaterThan(0);
  });

  it('should log ngOnInit', () => {
    expect(consoleSpy).toHaveBeenCalledWith('[ProfileComponent] ngOnInit');
  });

  it('should display the current user indicator in the table', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('COMMON.LABELS.YOU');
  });
});
