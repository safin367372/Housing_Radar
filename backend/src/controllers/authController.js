import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const validRoles = new Set(['student', 'owner'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  }
}

function createToken(user) {
  return jwt.sign(
    { role: user.role },
    process.env.JWT_SECRET,
    { subject: user.id, expiresIn: '7d' },
  )
}

export async function signup(req, res, next) {
  try {
    const name = typeof req.body.name === 'string' ? req.body.name.trim() : ''
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = req.body.password
    const role = req.body.role

    if (name.length < 2 || name.length > 80) {
      return res.status(400).json({ message: 'Name must be between 2 and 80 characters.' })
    }
    if (email.length > 254 || !emailPattern.test(email)) {
      return res.status(400).json({ message: 'Enter a valid email address.' })
    }
    if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and no more than 72 bytes.' })
    }
    if (!validRoles.has(role)) {
      return res.status(400).json({ message: 'Choose either student or owner as the account role.' })
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await User.create({ name, email, passwordHash, role })
    return res.status(201).json({ token: createToken(user), user: publicUser(user) })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account with this email already exists.' })
    }
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Please check the signup details and try again.' })
    }
    return next(error)
  }
}

export async function login(req, res, next) {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    const password = req.body.password

    if (!email || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required.' })
    }

    const user = await User.findOne({ email }).select('+passwordHash')
    const passwordMatches = user && await bcrypt.compare(password, user.passwordHash)
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Email or password is incorrect.' })
    }

    return res.json({ token: createToken(user), user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
}

export async function currentUser(req, res, next) {
  try {
    const user = await User.findById(req.auth.userId)
    if (!user) return res.status(401).json({ message: 'This account no longer exists.' })
    return res.json({ user: publicUser(user) })
  } catch (error) {
    return next(error)
  }
}
