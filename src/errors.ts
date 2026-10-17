export class ShieldCortexError extends Error {
  public readonly status: number;
  public readonly body: string;

  constructor(message: string, status: number, body: string) {
    super(message);
    this.name = 'ShieldCortexError';
    this.status = status;
    this.body = body;
  }
}

export class AuthError extends ShieldCortexError {
  constructor(body: string) {
    super('Authentication failed — check your API key', 401, body);
    this.name = 'AuthError';
  }
}

export class RateLimitError extends ShieldCortexError {
  public readonly retryAfter: number | null;

  constructor(body: string, retryAfter: number | null) {
    super('Rate limit exceeded', 429, body);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class ValidationError extends ShieldCortexError {
  constructor(body: string) {
    super('Validation error', 400, body);
    this.name = 'ValidationError';
  }
}

export class ForbiddenError extends ShieldCortexError {
  constructor(body: string) {
    super('Forbidden — insufficient permissions or plan', 403, body);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ShieldCortexError {
  constructor(body: string) {
    super('Resource not found', 404, body);
    this.name = 'NotFoundError';
  }
}

/**
 * The request did not complete within the client's `timeout`. The server may
 * still have received or processed it, and response headers may already have
 * arrived. `status` is always 0, an SDK sentinel rather than an HTTP status.
 */
export class TimeoutError extends ShieldCortexError {
  public readonly timeout: number;

  constructor(timeout: number) {
    super(`Request timed out after ${timeout} ms`, 0, '');
    this.name = 'TimeoutError';
    this.timeout = timeout;
  }
}
