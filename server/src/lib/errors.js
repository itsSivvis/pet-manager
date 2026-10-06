/**
 * API errors carry a stable machine-readable `code` (e.g. AUTH_INVALID_CREDENTIALS).
 * The client translates codes; `message` is an English fallback for API users.
 */
export class ApiError extends Error {
  constructor(status, code, message = code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = (what = 'RESOURCE') =>
  new ApiError(404, `${what}_NOT_FOUND`, `${what.toLowerCase()} not found`);
