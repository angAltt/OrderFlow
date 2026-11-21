/**
 * Wraps an async Express handler so rejected promises reach the error middleware.
 * (Express 5 does this natively; this keeps the code explicit and version-agnostic.)
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
