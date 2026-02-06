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
