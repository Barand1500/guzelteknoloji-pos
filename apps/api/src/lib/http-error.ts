import type { ApiErrorCode, ChallengeConfig } from '@gt/shared';

export class HttpError extends Error {
  challenge?: ChallengeConfig;
  constructor(
    public readonly status: number,
    public readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}
