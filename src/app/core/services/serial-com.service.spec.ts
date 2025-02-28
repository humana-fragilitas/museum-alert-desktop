import { TestBed } from '@angular/core/testing';

import { SerialService } from './serial-com.service';

describe('SerialService', () => {
  let service: SerialService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SerialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
