import { TestBed } from '@angular/core/testing';

import { DeviceConfigurationService } from './device-configuration.service';

describe('ProvisioningService', () => {
  let service: DeviceConfigurationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceConfigurationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
