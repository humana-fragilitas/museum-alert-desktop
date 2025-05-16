import { TestBed } from '@angular/core/testing';

import { SigV4Service } from './sig-v4.service';

describe('SigV4Service', () => {
  let service: SigV4Service;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SigV4Service);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
