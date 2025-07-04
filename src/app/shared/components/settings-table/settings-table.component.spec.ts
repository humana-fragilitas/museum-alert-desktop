import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SettingsTableComponent } from './settings-table.component';

describe('CompanyFormComponent', () => {
  let component: SettingsTableComponent;
  let fixture: ComponentFixture<SettingsTableComponent>;

  beforeEach(waitForAsync(() => {
    void TestBed.configureTestingModule({
      declarations: [SettingsTableComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(SettingsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
  
});
