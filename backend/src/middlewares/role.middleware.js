const AppError = require('../utils/AppError');

/**
 * Restricts a route to the given roles. Must run after `authenticate`.
 * Usage: router.post('/', authenticate, authorize('admin'), handler)
 * @param  {...('admin'|'viewer')} allowedRoles
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(AppError.unauthorized());
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(AppError.forbidden());
    }
    return next();
  };
}

module.exports = { authorize };
