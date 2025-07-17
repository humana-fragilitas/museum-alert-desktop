import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { DialogPayload, DialogType } from '../../../core/models';
import { COMMON_MATERIAL_IMPORTS } from '../../utils/material-imports';
import { TranslatePipe } from '@ngx-translate/core';


@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.scss'],
  imports: [
    CommonModule,
    TranslatePipe,
    ...COMMON_MATERIAL_IMPORTS
  ]
})
export class DialogComponent {

constructor(
    public dialogRef: MatDialogRef<DialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogPayload
  ) {}

  getDialogClass(): string {
    return `dialog-${this.data.type}`;
  }

  getIcon(): string {
    
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

      // Note: fallthrough to default; add any differentiations here
      case DialogType.ERROR:
      case DialogType.WARNING:
      case DialogType.SUCCESS:
      case DialogType.CONFIRM:
      default: return 'primary';

    }

  }

  getDefaultConfirmText(): string {

    switch (this.data.type) {
      case DialogType.CONFIRM: return 'COMMON.ACTIONS.YES';
      // Further cases here; see DialogType enum
      default: return 'COMMON.ACTIONS.OK';
    }

  }

  onConfirm(): void {

    this.dialogRef.close({ confirmed: true });

  }

  onCancel(): void {

    this.dialogRef.close({ confirmed: false });
    
  }

}
