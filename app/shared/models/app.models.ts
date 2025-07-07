
export enum AppErrorType {
    UNAUTHORIZED,
    FAILED_PROVISIONING_CLAIM_CREATION,
    FAILED_EXISTING_THING_CHECK,
    THING_ALREADY_EXISTS,
    THING_ALREADY_EXISTS_IN_OTHER_ORGANIZATION,
    GENERIC_ERROR,
    FAILED_COMPANY_UPDATE,
    FAILED_COMPANY_RETRIEVAL
};

export enum ErrorType {
    DEVICE_ERROR,
    APP_ERROR
};

export interface PendingRequest<T> {
  resolve: (data: T) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}
