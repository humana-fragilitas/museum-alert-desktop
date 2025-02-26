import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { WiFiCredentialsComponent } from './wifi-credentials.component';

describe('PageNotFoundComponent', () => {
  let component: WiFiCredentialsComponent;
  let fixture: ComponentFixture<WiFiCredentialsComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [WiFiCredentialsComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(WiFiCredentialsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
