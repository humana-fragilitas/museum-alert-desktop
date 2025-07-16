import { TestBed } from '@angular/core/testing';

import { DeviceConnectionStatusService } from './device-connection-status.service';

describe('DeviceConnectionStatusService', () => {
  let service: DeviceConnectionStatusService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DeviceConnectionStatusService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
