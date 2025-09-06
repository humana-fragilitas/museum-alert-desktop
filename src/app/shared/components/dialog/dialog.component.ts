import { TranslatePipe } from '@ngx-translate/core';

import { CommonModule } from '@angular/common';
import { Component,
         Inject } from '@angular/core';
import { MAT_DIALOG_DATA,
         MatDialogRef } from '@angular/material/dialog';

import { DialogPayload,
         DialogType } from '@models';
import { COMMON_MATERIAL_IMPORTS } from '@shared/utils/material-imports';


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

constructor(private readonly dialogRef: MatDialogRef<DialogComponent>,
            @Inject(MAT_DIALOG_DATA) readonly data: DialogPayload) { }

  get dialogClass(): string {
    return `dialog-${this.data.type}`;
  }

  get icon(): string {
    
    switch (this.data.type) {
      case DialogType.ERROR: return 'error';
      case DialogType.WARNING: return 'warning';
      case DialogType.SUCCESS: return 'check_circle';
      case DialogType.INFO: return 'info';
      case DialogType.CONFIRM: return 'help';
      default: return 'info';
    }

  }

  get iconClass(): string {
    return `icon-${this.data.type}`;
  }

  get buttonColor(): string {
    switch (this.data.type) {
      // Note: fallthrough to default; add any differentiations here
      case DialogType.ERROR:
      case DialogType.WARNING:
      case DialogType.SUCCESS:
      case DialogType.CONFIRM:
      default: return 'primary';
    }
  }

  get defaultConfirmText(): string {
    switch (this.data.type) {
      case DialogType.CONFIRM: return 'COMMON.ACTIONS.YES';
      // Further cases here; see DialogType enum
      default: return 'COMMON.ACTIONS.OK';
    }
  }

  onConfirm() {
    this.dialogRef.close({ confirmed: true });
  }

  onCancel() {
    this.dialogRef.close({ confirmed: false });
  }

}
