import jwt from 'jsonwebtoken'

export function requireAuth(req, res, next) {
  const authorization = req.get('Authorization') || ''
  const [scheme, token] = authorization.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Sign in to continue.' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.auth = { userId: payload.sub, role: payload.role }
    return next()
  } catch {
    return res.status(401).json({ message: 'Your session is invalid or has expired. Please sign in again.' })
  }
}
