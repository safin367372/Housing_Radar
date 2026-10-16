export function requireRole(role) {
  return function roleGuard(req, res, next) {
    if (req.auth?.role !== role) {
      return res.status(403).json({ message: 'This action is only available to ' + role + ' accounts.' })
    }
    return next()
  }
}
