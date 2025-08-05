// src/app/core/resolvers/company.resolver.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { CompanyResolver } from './company.resolver';
import { CompanyService } from '../services/company/company.service';
import { NotificationService } from '../services/notification/notification.service';
import { CompanyRole, CompanyWithUserContext } from '../models';
import { AppErrorType, ErrorType } from '../../../../app/shared';

describe('CompanyResolver', () => {
  let resolver: CompanyResolver;
  let companyService: jest.Mocked<CompanyService>;
  let notificationService: jest.Mocked<NotificationService>;

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
    const companyServiceMock = {
      get: jest.fn()
    };

    const notificationServiceMock = {
      onError: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        CompanyResolver,
        { provide: CompanyService, useValue: companyServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    resolver = TestBed.inject(CompanyResolver);
    companyService = TestBed.inject(CompanyService) as jest.Mocked<CompanyService>;
    notificationService = TestBed.inject(NotificationService) as jest.Mocked<NotificationService>;
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
      companyService.get.mockReturnValue(of(mockCompanyData));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      resolver.resolve().subscribe({
        next: (result) => {
          // Assert
          expect(result).toEqual(mockCompanyData);
          expect(companyService.get).toHaveBeenCalledTimes(1);
          expect(consoleSpy).toHaveBeenCalledWith('Company data resolved:', mockCompanyData);
          expect(notificationService.onError).not.toHaveBeenCalled();
          consoleSpy.mockRestore();
          done();
        },
        error: () => {
          fail('Should not reach error handler');
        }
      });
    });

    it('should return null when service returns null', (done) => {
      // Arrange
      companyService.get.mockReturnValue(of(null));
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      resolver.resolve().subscribe({
        next: (result) => {
          // Assert
          expect(result).toBeNull();
          expect(companyService.get).toHaveBeenCalledTimes(1);
          expect(consoleSpy).toHaveBeenCalledWith('Company data resolved:', null);
          expect(notificationService.onError).not.toHaveBeenCalled();
          consoleSpy.mockRestore();
          done();
        },
        error: () => {
          fail('Should not reach error handler');
        }
      });
    });

    it('should handle HTTP error and show notification', (done) => {
      // Arrange
      const mockError = new HttpErrorResponse({
        error: { message: 'Company not found' },
        status: 404,
        statusText: 'Not Found',
        url: '/api/company'
      });

      companyService.get.mockReturnValue(throwError(() => mockError));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      resolver.resolve().subscribe({
        next: () => {
          fail('Should not reach success handler');
        },
        error: (error) => {
          // Assert
          expect(error).toBe(mockError);
          expect(companyService.get).toHaveBeenCalledTimes(1);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to resolve company data:', mockError);
          expect(notificationService.onError).toHaveBeenCalledWith(
            ErrorType.APP_ERROR,
            AppErrorType.FAILED_COMPANY_RETRIEVAL,
            mockError
          );
          expect(notificationService.onError).toHaveBeenCalledTimes(1);
          consoleErrorSpy.mockRestore();
          done();
        }
      });
    });

    it('should handle network error and show notification', (done) => {
      // Arrange
      const mockError = new HttpErrorResponse({
        error: new ErrorEvent('Network error'),
        status: 0,
        statusText: 'Unknown Error',
        url: '/api/company'
      });

      companyService.get.mockReturnValue(throwError(() => mockError));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      resolver.resolve().subscribe({
        next: () => {
          fail('Should not reach success handler');
        },
        error: (error) => {
          // Assert
          expect(error).toBe(mockError);
          expect(companyService.get).toHaveBeenCalledTimes(1);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to resolve company data:', mockError);
          expect(notificationService.onError).toHaveBeenCalledWith(
            ErrorType.APP_ERROR,
            AppErrorType.FAILED_COMPANY_RETRIEVAL,
            mockError
          );
          expect(notificationService.onError).toHaveBeenCalledTimes(1);
          consoleErrorSpy.mockRestore();
          done();
        }
      });
    });

    it('should handle server error (500) and show notification', (done) => {
      // Arrange
      const mockError = new HttpErrorResponse({
        error: { message: 'Internal server error' },
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/company'
      });

      companyService.get.mockReturnValue(throwError(() => mockError));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act
      resolver.resolve().subscribe({
        next: () => {
          fail('Should not reach success handler');
        },
        error: (error) => {
          // Assert
          expect(error).toBe(mockError);
          expect(companyService.get).toHaveBeenCalledTimes(1);
          expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to resolve company data:', mockError);
          expect(notificationService.onError).toHaveBeenCalledWith(
            ErrorType.APP_ERROR,
            AppErrorType.FAILED_COMPANY_RETRIEVAL,
            mockError
          );
          consoleErrorSpy.mockRestore();
          done();
        }
      });
    });

    it('should not call notification service multiple times on subsequent errors', (done) => {
      // Arrange
      const mockError = new HttpErrorResponse({
        error: { message: 'Service unavailable' },
        status: 503,
        statusText: 'Service Unavailable',
        url: '/api/company'
      });

      companyService.get.mockReturnValue(throwError(() => mockError));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      // Act - First call
      resolver.resolve().subscribe({
        next: () => fail('Should not reach success handler'),
        error: () => {
          // Assert first call
          expect(notificationService.onError).toHaveBeenCalledTimes(1);
          
          // Act - Second call
          resolver.resolve().subscribe({
            next: () => fail('Should not reach success handler'),
            error: () => {
              // Assert second call
              expect(notificationService.onError).toHaveBeenCalledTimes(2);
              expect(companyService.get).toHaveBeenCalledTimes(2);
              consoleErrorSpy.mockRestore();
              done();
            }
          });
        }
      });
    });
  });
});