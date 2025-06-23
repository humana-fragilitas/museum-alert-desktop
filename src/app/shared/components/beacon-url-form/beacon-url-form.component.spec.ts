import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { BeaconUrlFormComponent } from './beacon-url-form.component';

describe('CompanyFormComponent', () => {
  let component: BeaconUrlFormComponent;
  let fixture: ComponentFixture<BeaconUrlFormComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [BeaconUrlFormComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(BeaconUrlFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
