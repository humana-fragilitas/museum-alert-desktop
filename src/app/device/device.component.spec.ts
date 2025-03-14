import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DeviceComponent } from './device.component';

describe('PageNotFoundComponent', () => {
  let component: DeviceComponent;
  let fixture: ComponentFixture<DeviceComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [DeviceComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DeviceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});