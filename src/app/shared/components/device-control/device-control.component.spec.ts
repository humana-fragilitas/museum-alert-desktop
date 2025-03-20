import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DeviceControlComponent } from './device-control.component';

describe('DeviceControlComponent', () => {
  let component: DeviceControlComponent;
  let fixture: ComponentFixture<DeviceControlComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [DeviceControlComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DeviceControlComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
