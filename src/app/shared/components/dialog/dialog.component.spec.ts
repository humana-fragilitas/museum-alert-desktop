import { TranslateModule } from '@ngx-translate/core';

import { TestBed,
         ComponentFixture } from '@angular/core/testing';
import { MAT_DIALOG_DATA,
         MatDialogRef } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { DialogType } from '@models';
import { DialogComponent } from './dialog.component';


const baseData = {
  type: DialogType.ERROR,
  title: 'Test Title',
  message: 'Test Message',
  showCancel: true,
  confirmText: '',
  cancelText: '',
  messageParams: undefined
};

describe('DialogComponent', () => {
  let fixture: ComponentFixture<DialogComponent>;
  let component: DialogComponent;
  let dialogRefMock: { close: jest.Mock };

  beforeEach(async () => {
    dialogRefMock = { close: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [
        DialogComponent,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: MAT_DIALOG_DATA, useValue: { ...baseData } },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(DialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render title and message', () => {
    const title = fixture.debugElement.query(By.css('.dialog-title'));
    const message = fixture.debugElement.query(By.css('.dialog-message'));
    expect(title.nativeElement.textContent).toContain('Test Title');
    expect(message.nativeElement.textContent).toContain('Test Message');
  });

  it('should render the correct icon for each dialog type', () => {
    const typeIconMap = [
      [DialogType.ERROR, 'error'],
      [DialogType.WARNING, 'warning'],
      [DialogType.SUCCESS, 'check_circle'],
      [DialogType.INFO, 'info'],
      [DialogType.CONFIRM, 'help']
    ];
    for (const [type, icon] of typeIconMap) {
      component.data.type = type as DialogType;
      fixture.detectChanges();
      const iconEl = fixture.debugElement.query(By.css('.dialog-icon'));
      expect(iconEl.nativeElement.textContent).toContain(icon);
    }
  });

  it('should apply the correct dialog class and icon class', () => {
    component.data.type = DialogType.WARNING;
    fixture.detectChanges();
    const container = fixture.debugElement.query(By.css('.dialog-container'));
    expect(container.nativeElement.classList).toContain('dialog-warning');
    const icon = fixture.debugElement.query(By.css('.dialog-icon'));
    expect(icon.nativeElement.classList).toContain('icon-warning');
  });

  it('should use the correct button color', () => {
    component.data.type = DialogType.ERROR;
    fixture.detectChanges();
    const confirmBtn = fixture.debugElement.query(By.css('.confirm-button'));
    expect(confirmBtn.attributes['ng-reflect-color']).toBe('primary');
  });

  it('should use the correct default confirm text', () => {
    component.data.type = DialogType.CONFIRM;
    component.data.confirmText = '';
    fixture.detectChanges();
    const confirmBtn = fixture.debugElement.query(By.css('.confirm-button'));
    expect(confirmBtn.nativeElement.textContent).toContain('COMMON.ACTIONS.YES');
    component.data.type = DialogType.ERROR;
    fixture.detectChanges();
    expect(confirmBtn.nativeElement.textContent).toContain('COMMON.ACTIONS.OK');
  });

  it('should call dialogRef.close({ confirmed: true }) on confirm', () => {
    const confirmBtn = fixture.debugElement.query(By.css('.confirm-button'));
    confirmBtn.nativeElement.click();
    expect(dialogRefMock.close).toHaveBeenCalledWith({ confirmed: true });
  });

  it('should call dialogRef.close({ confirmed: false }) on cancel', () => {
    const cancelBtn = fixture.debugElement.query(By.css('.cancel-button'));
    cancelBtn.nativeElement.click();
    expect(dialogRefMock.close).toHaveBeenCalledWith({ confirmed: false });
  });

  it('should not render cancel button if showCancel is false', () => {
    component.data.showCancel = false;
    fixture.detectChanges();
    const cancelBtn = fixture.debugElement.query(By.css('.cancel-button'));
    expect(cancelBtn).toBeNull();
  });
});
