/** An error with a stable machine code and HTTP status. Anything else thrown becomes a 500. */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (message = "The request is not valid.", details?: unknown) =>
    new AppError("BAD_REQUEST", message, 400, details),
  validation: (message: string, details?: unknown) =>
    new AppError("VALIDATION_ERROR", message, 422, details),
  unauthorized: (message = "Sign in to continue.") => new AppError("UNAUTHORIZED", message, 401),
  forbidden: (message = "You do not have permission to do that.") =>
    new AppError("FORBIDDEN", message, 403),
  notFound: (what = "Resource") => new AppError("NOT_FOUND", `${what} not found.`, 404),
  conflict: (message: string, code = "CONFLICT") => new AppError(code, message, 409),
  tooMany: (retryAfterSec: number) =>
    new AppError(
      "RATE_LIMITED",
      "Too many attempts. Please wait a moment and try again.",
      429,
      undefined,
      { "Retry-After": String(Math.max(1, Math.ceil(retryAfterSec))) },
    ),
};
