import { TestBed } from '@angular/core/testing';
import { ErrorService } from './error.service';
import { DeviceErrorType } from '@shared-with-electron';
import { DialogService } from '@services/dialog/dialog.service';

describe('ErrorService', () => {
  let service: ErrorService;
  let dialogService: jest.Mocked<DialogService>;

  beforeEach(() => {
    dialogService = { openDialog: jest.fn() } as any;
    TestBed.configureTestingModule({
      providers: [
        ErrorService,
        { provide: DialogService, useValue: dialogService }
      ]
    });
    service = TestBed.inject(ErrorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return correct translation tag for all known DeviceErrorType codes', () => {
    const keys = Object.keys(DeviceErrorType).filter(k => isNaN(Number(k)));
    for (const key of keys) {
      const code = DeviceErrorType[key as keyof typeof DeviceErrorType];
      const tag = service.toTranslationTag(code);
      expect(typeof tag).toBe('string');
      expect(tag.startsWith('ERRORS.DEVICE.')).toBe(true);
      expect(tag).not.toBe('ERRORS.DEVICE.UNKNOWN_ERROR');
    }
  });

  it('should return fallback tag for unknown code', () => {
    const tag = service.toTranslationTag(999 as DeviceErrorType);
    expect(tag).toBe('ERRORS.DEVICE.UNKNOWN_ERROR');
  });

  it('should return fallback tag for null/undefined', () => {
    expect(service.toTranslationTag(null as any)).toBe('ERRORS.DEVICE.UNKNOWN_ERROR');
    expect(service.toTranslationTag(undefined as any)).toBe('ERRORS.DEVICE.UNKNOWN_ERROR');
  });

  it('should log correct message for known and unknown codes', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation();
    // Known code
    service.toTranslationTag(DeviceErrorType.INVALID_WIFI_CREDENTIALS);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('corresponds to translation tag')
    );
    // Unknown code
    service.toTranslationTag(999 as DeviceErrorType);
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('does not correspond to any translation tag')
    );
    logSpy.mockRestore();
  });
});