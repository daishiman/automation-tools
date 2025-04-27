export class AppError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class AuthError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}

export class ServiceError extends AppError {
  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(code, message, details);
  }
}
