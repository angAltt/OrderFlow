/**
 * Operational error with an HTTP status code.
 * Thrown from controllers/services and formatted by the error middleware.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }

  static badRequest(message = 'Bad request', details) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(message, 401);
  }

  static forbidden(message = 'You do not have permission to perform this action') {
    return new AppError(message, 403);
  }

  static notFound(message = 'Resource not found') {
    return new AppError(message, 404);
  }

  static conflict(message = 'Conflict', details) {
    return new AppError(message, 409, details);
  }
}

module.exports = AppError;
