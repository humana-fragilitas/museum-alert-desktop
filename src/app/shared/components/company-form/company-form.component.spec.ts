import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CompanyFormComponent } from './company-form.component';

describe('CompanyFormComponent', () => {
  let component: CompanyFormComponent;
  let fixture: ComponentFixture<CompanyFormComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [CompanyFormComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CompanyFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
