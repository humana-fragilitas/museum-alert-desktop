import { Observable, of } from 'rxjs';

import { Injectable } from '@angular/core';
import { MatDialog, MatDialogConfig } from '@angular/material/dialog';

import { DialogComponent } from '@shared/components/dialog/dialog.component';
import { DialogPayload, DialogResult, DialogType } from '@models'
import { AuthenticationExpiredError } from '@interceptors/auth-token.interceptor';


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

  openDialog(data: DialogPayload, configuration: MatDialogConfig = {}): Observable<DialogResult | null> {

    // Skip authentication errors by default (unless explicitly overridden)
    if (data.exception) {
      data.type = DialogType.ERROR;
      console.log(`[DialogService]: got and exception; overriding modal type to 'Error' by default`);
      if (data.exception instanceof AuthenticationExpiredError) {
        console.log(`[DialogService]: skipping error modal: error is of type 'AuthenticationExpiredError':`, data.exception);
        return of(null);
      }
    }    

    const dialogRef = this.dialog.open(DialogComponent, {
      ...this.defaultConfiguration,
      ...configuration,
      data
    });
    return dialogRef.afterClosed();

  }

}