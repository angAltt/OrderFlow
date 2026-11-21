const env = require('../config/env');
const AppError = require('../utils/AppError');

function notFoundHandler(req, res, next) {
  next(AppError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
}

// Maps known MySQL errors to HTTP responses.
function mapDatabaseError(error) {
  switch (error.code) {
    case 'ER_DUP_ENTRY':
      return AppError.conflict('A record with the same unique value already exists');
    case 'ER_ROW_IS_REFERENCED_2':
      return AppError.conflict('This record is referenced by other data and cannot be deleted');
    case 'ER_NO_REFERENCED_ROW_2':
      return AppError.badRequest('A referenced record does not exist');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
    case 'ER_CONSTRAINT_FAILED': // MariaDB code for the same case
      return AppError.badRequest('One or more values violate a database constraint');
    // Safety net: validators should catch these first.
    case 'ER_DATA_TOO_LONG':
    case 'ER_WARN_DATA_OUT_OF_RANGE':
      return AppError.badRequest('One or more values are too long or out of range');
    default:
      return null;
  }
}

function errorHandler(error, req, res, next) {
  let err = error;

  if (err.type === 'entity.parse.failed') {
    err = AppError.badRequest('Malformed JSON body');
  } else if (!(err instanceof AppError)) {
    err = mapDatabaseError(err) || err;
  }

  const statusCode = err.statusCode || 500;

  if (statusCode >= 500) {
    console.error('[error]', error);
  }

  const body = {
    success: false,
    message: statusCode >= 500 && env.isProduction ? 'Internal server error' : err.message,
  };
  if (err.details) body.details = err.details;
  if (!env.isProduction && statusCode >= 500) body.stack = error.stack;

  res.status(statusCode).json(body);
}

module.exports = { notFoundHandler, errorHandler };
