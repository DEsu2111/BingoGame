export interface ApiErrorResponse {
  error: string;
}

export interface ApiOkResponse<T = unknown> {
  data: T;
}
