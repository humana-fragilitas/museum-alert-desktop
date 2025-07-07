
export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  statusCode: number;
  data: T | ApiErrorResponse;
}