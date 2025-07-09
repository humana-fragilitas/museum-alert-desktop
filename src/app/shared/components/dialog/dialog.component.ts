import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogData, DialogType } from '../../../core/models';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';


@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
  imports: [
    CommonModule,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DialogComponent {

constructor(
    public dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  getDialogClass(): string {
    return `dialog-${this.data.type}`;
  }

  getIcon(): string {

    if (this.data.icon) return this.data.icon;
    
    switch (this.data.type) {
      case DialogType.ERROR: return 'error';
      case DialogType.WARNING: return 'warning';
      case DialogType.SUCCESS: return 'check_circle';
      case DialogType.INFO: return 'info';
      case DialogType.CONFIRM: return 'help';
      default: return 'info';
    }

  }

  getIconClass(): string {

    return `icon-${this.data.type}`;

  }

  getButtonColor(): string {

    switch (this.data.type) {
      // case DialogType.ERROR: return 'warn'; USEFUL FOR ERROR DIALOGS
      case DialogType.ERROR: return 'primary';
      case DialogType.WARNING: return 'primary';
      case DialogType.SUCCESS: return 'primary';
      case DialogType.CONFIRM: return 'primary';
      default: return 'primary';
    }

  }

  getDefaultConfirmText(): string {

    switch (this.data.type) {
      case DialogType.CONFIRM: return 'Yes';
      default: return 'OK';
    }

  }

  onConfirm(): void {

    this.dialogRef.close({ confirmed: true });

  }

  onCancel(): void {

    this.dialogRef.close({ confirmed: false });
    
  }

}
