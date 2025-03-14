import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DeviceStateComponent } from './device-state.component';

describe('WizardComponent', () => {
  let component: DeviceStateComponent;
  let fixture: ComponentFixture<DeviceStateComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [DeviceStateComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DeviceStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
