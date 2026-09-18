export class AIProviderError extends Error {
  readonly provider: string;
  readonly status?: number;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(options: {
    provider: string;
    message: string;
    status?: number;
    retryable?: boolean;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "AIProviderError";
    this.provider = options.provider;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500;
}
