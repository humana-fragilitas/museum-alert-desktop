export enum DialogType {
  ERROR = 'error',
  WARNING = 'warning',
  SUCCESS = 'success',
  INFO = 'info',
  CONFIRM = 'confirm'
}

export interface DialogPayload {
  type?: DialogType;
  title: string;
  message: string;
  messageParams?: { [key: string]: string | number };
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

export interface DialogResult {
  confirmed: boolean;
  data?: any;
}