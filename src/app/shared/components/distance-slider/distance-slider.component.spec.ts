import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DistanceSliderComponent } from './distance-slider.component';

describe('CompanyFormComponent', () => {
  let component: DistanceSliderComponent;
  let fixture: ComponentFixture<DistanceSliderComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [DistanceSliderComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DistanceSliderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
