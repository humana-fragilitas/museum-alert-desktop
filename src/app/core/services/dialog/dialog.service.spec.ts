import { TestBed } from '@angular/core/testing';

import { DeviceRegistryService } from '../device-registry/device-registry.service';

describe('ProvisioningService', () => {
  let service: DeviceRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceRegistryService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
