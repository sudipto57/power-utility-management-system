// Use after requireAuth.  Example:  router.use(requireAuth, requireRole('admin'))
import ApiError from '../utils/ApiError.js';

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to do this'));
    }
    return next();
  };
}
