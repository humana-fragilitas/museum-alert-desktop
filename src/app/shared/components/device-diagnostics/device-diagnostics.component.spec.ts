import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DeviceDiagnosticsComponent } from './device-diagnostics.component';

describe('DeviceControlComponent', () => {
  let component: DeviceDiagnosticsComponent;
  let fixture: ComponentFixture<DeviceDiagnosticsComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [DeviceDiagnosticsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DeviceDiagnosticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
