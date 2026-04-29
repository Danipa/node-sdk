/**
 * Base class for every error this SDK throws. Catch this once, then narrow
 * with `instanceof DanipaApiError` for HTTP failures or `instanceof
 * DanipaNetworkError` for transport failures.
 */
export class DanipaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DanipaError';
  }
}

/**
 * Thrown when the backend returns a non-2xx response. Carries the parsed
 * error envelope (matches `StatusUtils.createErrorStatus` on the fintech
 * side) so callers can branch on stable error codes.
 */
export class DanipaApiError extends DanipaError {
  readonly status: number;
  readonly code: string;
  readonly correlationId: string | undefined;
  readonly raw: unknown;

  constructor(
    status: number,
    code: string,
    message: string,
    correlationId: string | undefined,
    raw: unknown,
  ) {
    super(message);
    this.name = 'DanipaApiError';
    this.status = status;
    this.code = code;
    this.correlationId = correlationId;
    this.raw = raw;
  }
}

/** Thrown when the request never reached the backend (DNS, TLS, abort). */
export class DanipaNetworkError extends DanipaError {
  readonly cause: unknown;

  constructor(message: string, cause: unknown) {
    super(message);
    this.name = 'DanipaNetworkError';
    this.cause = cause;
  }
}

/** Shape of the fintech backend's error envelope. */
export interface BackendErrorEnvelope {
  timeStamp?: number;
  correlationId?: string;
  traceId?: string;
  statusCode?: number;
  domain?: string;
  severity?: 'ERROR' | 'WARN' | 'INFO';
  errors?: Array<{ code: string; description: string }>;
}
