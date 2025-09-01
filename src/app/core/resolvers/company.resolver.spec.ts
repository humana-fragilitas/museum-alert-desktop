import { of,
         throwError } from 'rxjs';
import { jest } from '@jest/globals';
import { TranslateService,
         TranslateLoader,
         TranslateCompiler,
         TranslateStore,
         TranslateParser,
         MissingTranslationHandler,
         USE_DEFAULT_LANG,
         DEFAULT_LANGUAGE,
         USE_EXTEND } from '@ngx-translate/core';

import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';

import { CompanyResolver } from './company.resolver';
import { CompanyService } from '@services/company/company.service';
import { NotificationService } from '@services/notification/notification.service';
import { DialogService } from '@services/dialog/dialog.service';
import { CompanyRole,
         CompanyWithUserContext } from '@models';


describe('CompanyResolver', () => {
  let resolver: CompanyResolver;
  let companyService: { fetch: jest.Mock };
  let notificationService: { onError: jest.Mock };
  let dialogService: { openDialog: jest.Mock };

  const mockCompanyData: CompanyWithUserContext = {
    companyId: '123',
    companyName: 'Test Company',
    status: 'active',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
    ownerEmail: 'owner@company.com',
    ownerUsername: 'owner',
    memberCount: 2,
    members: [
      {
        email: 'owner@company.com',
        username: 'owner',
        role: 'owner' as CompanyRole,
        joinedAt: '2023-01-01T00:00:00.000Z'
      },
      {
        email: 'admin@company.com',
        username: 'admin',
        role: 'admin' as CompanyRole,
        joinedAt: '2023-01-15T00:00:00.000Z'
      }
    ],
    userRole: 'admin',
    userJoinedAt: '2023-01-15T00:00:00.000Z'
  };

  beforeEach(() => {
    companyService = {
      fetch: jest.fn()
    };

    notificationService = {
      onError: jest.fn()
    };

    dialogService = {
      openDialog: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        CompanyResolver,
        { provide: CompanyService, useValue: companyService },
        { provide: NotificationService, useValue: notificationService },
        { provide: DialogService, useValue: dialogService },
        { provide: TranslateStore, useValue: {} },
        { provide: TranslateLoader, useValue: { getTranslation: jest.fn(() => of({})) } },
        { provide: TranslateService, useValue: { get: jest.fn(() => of('')), instant: jest.fn(() => ''), onLangChange: of({}), onTranslationChange: of({}), onDefaultLangChange: of({}) } },
        { provide: TranslateCompiler, useValue: {} },
        { provide: TranslateParser, useValue: {} },
        { provide: MissingTranslationHandler, useValue: {} },
        { provide: USE_DEFAULT_LANG, useValue: true },
        { provide: DEFAULT_LANGUAGE, useValue: 'en' },
        { provide: USE_EXTEND, useValue: false }
      ]
    });

    resolver = TestBed.inject(CompanyResolver);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(resolver).toBeTruthy();
  });

  describe('resolve', () => {
    it('should return company data when service call succeeds', (done) => {
      // Arrange
      companyService.fetch.mockReturnValue(of(mockCompanyData));

      // Act
      resolver.resolve().subscribe({
        next: (result) => {
          // Assert
          expect(result).toEqual(mockCompanyData);
          done();
        },
        error: done.fail
      });
    });

    it('should return null when service returns null', (done) => {
      // Arrange
      companyService.fetch.mockReturnValue(of(null));

      // Act
      resolver.resolve().subscribe({
        next: (result) => {
          // Assert
          expect(result).toBeNull();
          expect(companyService.fetch).toHaveBeenCalledTimes(1);
          done();
        },
        error: () => {
          fail('Should not reach error handler');
        }
      });
    });

    it('should handle error and call dialogService.openDialog', (done) => {
      // Arrange
      const error = { status: 404, statusText: 'Not Found' };
      companyService.fetch.mockReturnValue(throwError(() => error));

      // Act
      resolver.resolve().subscribe({
        next: () => {
          fail('Should not reach success handler');
        },
        error: (err) => {
          // Assert
          if (err && typeof err === 'object' && 'status' in err) {
            expect((err as any).status).toBe(404);
          } else {
            expect(err).toBeDefined();
          }
          expect(dialogService.openDialog).toHaveBeenCalled();
          done();
        }
      });
    });

    it('should handle network error and show dialog', (done) => {
      // Arrange
      const mockError = new HttpErrorResponse({
        error: new ErrorEvent('Network error'),
        status: 0,
        statusText: 'Unknown Error',
        url: '/api/company'
      });

      companyService.fetch.mockReturnValue(throwError(() => mockError));

      // Act
      resolver.resolve().subscribe({
        next: () => {
          fail('Should not reach success handler');
        },
        error: (error) => {
          if (error && typeof error === 'object' && 'status' in error) {
            expect((error as any).status).toBe(0);
          } else {
            expect(error).toBeDefined();
          }
          expect(companyService.fetch).toHaveBeenCalledTimes(1);
          expect(dialogService.openDialog).toHaveBeenCalledWith(
            expect.objectContaining({
              exception: mockError,
              title: expect.any(String),
              message: expect.any(String)
            })
          );
          expect(dialogService.openDialog).toHaveBeenCalledTimes(1);
          done();
        }
      });
    });

    it('should handle server error (500) and show dialog', (done) => {
      // Arrange
      const mockError = new HttpErrorResponse({
        error: { message: 'Internal server error' },
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/company'
      });

      companyService.fetch.mockReturnValue(throwError(() => mockError));

      // Act
      resolver.resolve().subscribe({
        next: () => {
          fail('Should not reach success handler');
        },
        error: (error) => {
          if (error && typeof error === 'object' && 'status' in error) {
            expect((error as any).status).toBe(500);
          } else {
            expect(error).toBeDefined();
          }
          expect(companyService.fetch).toHaveBeenCalledTimes(1);
          expect(dialogService.openDialog).toHaveBeenCalledWith(
            expect.objectContaining({
              exception: mockError,
              title: expect.any(String),
              message: expect.any(String)
            })
          );
          done();
        }
      });
    });

    it('should not call dialogService.openDialog multiple times on subsequent errors', (done) => {
      // Arrange
      const mockError = new HttpErrorResponse({
        error: { message: 'Service unavailable' },
        status: 503,
        statusText: 'Service Unavailable',
        url: '/api/company'
      });

      companyService.fetch.mockReturnValue(throwError(() => mockError));

      // Act - First call
      resolver.resolve().subscribe({
        next: () => fail('Should not reach success handler'),
        error: () => {
          // Assert first call
          expect(dialogService.openDialog).toHaveBeenCalledTimes(1);
          // Act - Second call
          resolver.resolve().subscribe({
            next: () => fail('Should not reach success handler'),
            error: () => {
              // Assert second call
              expect(dialogService.openDialog).toHaveBeenCalledTimes(2);
              expect(companyService.fetch).toHaveBeenCalledTimes(2);
              done();
            }
          });
        }
      });
    });
  });
});