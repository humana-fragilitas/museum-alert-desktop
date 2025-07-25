import { Observable } from 'rxjs';

import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

import { DialogComponent } from '@shared/components/dialog/dialog.component';
import { DialogPayload, DialogResult } from '@models'


@Injectable({
  providedIn: 'root'
})
export class DialogService {

  private readonly defaultConfiguration: MatDialogConfig = {
    width: '400px',
    disableClose: true,
    autoFocus: true,
    restoreFocus: true
  };

  constructor(private dialog: MatDialog) { }

  openDialog(data: DialogPayload, configuration: MatDialogConfig = {}): Observable<DialogResult> {

    const dialogRef = this.dialog.open(DialogComponent, {
      ...this.defaultConfiguration,
      ...configuration,
      data
    });
    return dialogRef.afterClosed();

  }

}