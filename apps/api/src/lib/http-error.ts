import type { ApiErrorCode } from '@gt/shared';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
