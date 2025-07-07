export enum DialogType {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info',
  CONFIRM = 'confirm'
}

export interface DialogData {
  type: DialogType;
  title: string;
  message: string;
  details?: string;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
  icon?: string;
  width?: string;
  disableClose?: boolean;
}

export interface DialogResult {
  confirmed: boolean;
  data?: any;
}