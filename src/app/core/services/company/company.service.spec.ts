import { TestBed,
         fakeAsync,
         tick,
         flush } from '@angular/core/testing';
import { signal,
         ApplicationRef } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting,
         HttpTestingController } from '@angular/common/http/testing';

import { CompanyService } from './company.service';
import { AuthService } from '@services/auth/auth.service';
import { CompanyWithUserContext,
         UpdateCompanyRequest,
         UpdateCompanyResponse,
         CompanyRole,
         SuccessApiResponse } from '@models';
import { APP_CONFIG } from '@env/environment';


jest.mock('@env/environment', () => ({
  APP_CONFIG: { aws: { apiGateway: 'https://api.example.com' } }
}));

describe('CompanyService', () => {

  let service: CompanyService;
  let httpMock: HttpTestingController;
  let authService: { sessionData: any };
  let sessionSignal: any;
  let appRef: ApplicationRef;

  const mockCompany: CompanyWithUserContext = {
    companyId: 'id',
    companyName: 'Test',
    status: 'active',
    createdAt: '',
    updatedAt: '',
    ownerEmail: '',
    ownerUsername: '',
    memberCount: 1,
    members: [],
    userRole: CompanyRole.OWNER,
    userJoinedAt: ''
  };

  const triggerEffects = () => {
    appRef.tick();
  };

  beforeEach(async () => {

    sessionSignal = signal<any>(null);
    authService = {
      sessionData: sessionSignal.asReadonly(),
    };
    await TestBed.configureTestingModule({
      providers: [
        CompanyService,
        { provide: AuthService, useValue: authService },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(CompanyService);
    httpMock = TestBed.inject(HttpTestingController);
    appRef = TestBed.inject(ApplicationRef);
    jest.clearAllMocks();

  });

  afterEach(() => {
    httpMock.verify();
    jest.resetAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch company data and update signal', (done) => {
    service.fetch().subscribe(resp => {
      if ('data' in resp) {
        expect(resp.data).toEqual(mockCompany);
        expect(service.company()).toEqual(mockCompany);
      }
      done();
    });
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
    expect(req.request.method).toBe('GET');
    req.flush({ data: mockCompany });
  });

  it('should set company to null on clear()', () => {
    service['companySignal'].set(mockCompany);
    service.clear();
    expect(service.company()).toBeNull();
  });

  it('should set isFetchingCompany true/false during fetch', fakeAsync(() => {
    let states: boolean[] = [];
    
    states.push(service.isFetchingCompany());
    
    const sub = service.fetch().subscribe(() => {
    });
    
    states.push(service.isFetchingCompany());
    
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
    req.flush({ data: mockCompany });
    
    tick();
    flush();
    
    states.push(service.isFetchingCompany());
    
    const deduped = states.filter((v, i, arr) => i === 0 || v !== arr[i-1]);
    expect(deduped).toEqual([false, true, false]);
    
    sub.unsubscribe();
  }));

  it('should handle fetch error and set isFetchingCompany to false', fakeAsync(() => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    let errorHandled = false;
    
    service.fetch().subscribe({
      error: err => {
        errorHandled = true;
      }
    });
    
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
    req.flush('fail', { status: 500, statusText: 'fail' });
    
    tick();
    flush();
    
    expect(consoleSpy).toHaveBeenCalled();
    expect(service.isFetchingCompany()).toBe(false);
    expect(errorHandled).toBe(true);
    
    consoleSpy.mockRestore();
  }));

  it('should update company name and preserve user context', (done) => {
    service['companySignal'].set(mockCompany);
    const updateReq: UpdateCompanyRequest = { companyName: 'NewName' };
    const updatedCompany = { ...mockCompany, companyName: 'NewName' };
    const resp: SuccessApiResponse<UpdateCompanyResponse> = {
      data: { message: '', company: updatedCompany, updatedFields: ['companyName'] },
      timestamp: ''
    };
    service.setName(updateReq).subscribe(r => {
      expect(r).toEqual(resp);
      expect(service.company()?.companyName).toBe('NewName');
      expect(service.company()?.userRole).toBe(mockCompany.userRole);
      done();
    });
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
    expect(req.request.method).toBe('PATCH');
    req.flush(resp);
  });

  it('should handle setName error', (done) => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    service['companySignal'].set(mockCompany);
    service.setName({ companyName: 'fail' }).subscribe({
      error: err => {
        expect(consoleSpy).toHaveBeenCalled();
        done();
      }
    });
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
    req.flush('fail', { status: 400, statusText: 'fail' });
    consoleSpy.mockRestore();
  });

  it('should clear company when sessionData becomes null', fakeAsync(() => {
    service['companySignal'].set(mockCompany);
    
    sessionSignal.set(null);
    
    triggerEffects();
    tick();
    flush();
    
    expect(service.company()).toBeNull();
  }));

  it('should fetch company when sessionData becomes available', fakeAsync(() => {
    sessionSignal.set({ user: 'test' });
    
    triggerEffects();
    tick();
    
    const req = httpMock.expectOne(`${APP_CONFIG.aws.apiGateway}/company`);
    req.flush({ data: mockCompany });
    
    tick();
    flush();
    
    expect(service.company()).toEqual(mockCompany);
  }));

  it('isOwner should return true if userRole is OWNER', () => {
    service['companySignal'].set({ ...mockCompany, userRole: CompanyRole.OWNER });
    expect(service.isOwner()).toBe(true);
  });

  it('isOwner should return false if userRole is not OWNER', () => {
    service['companySignal'].set({ ...mockCompany, userRole: CompanyRole.MEMBER });
    expect(service.isOwner()).toBe(false);
  });

  it('isOwner should return false if no company', () => {
    service.clear();
    expect(service.isOwner()).toBe(false);
  });

});