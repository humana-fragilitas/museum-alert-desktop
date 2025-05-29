import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DialogComponent } from './dialog.component';

describe('ProvisioningComponent', () => {
  let component: DialogComponent;
  let fixture: ComponentFixture<DialogComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [DialogComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
