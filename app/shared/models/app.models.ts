export interface PendingRequest<T> {
  resolve: (data: T) => void;
  reject: (error: any) => void;
  timeout: NodeJS.Timeout;
}
