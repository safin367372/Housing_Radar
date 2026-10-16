import cors from 'cors'
import express from 'express'
import authRoutes from './routes/authRoutes.js'
import listingRoutes from './routes/listingRoutes.js'

const app = express()
const allowedOrigins = (process.env.CLIENT_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('This frontend origin is not allowed by CORS.'))
  },
}))
app.use(express.json({ limit: '16kb' }))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})
app.use('/api/auth', authRoutes)
app.use('/api/listings', listingRoutes)
app.use((req, res) => {
  res.status(404).json({ message: 'API route not found.' })
})
app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ message: 'Request body must contain valid JSON.' })
  }
  if (error.message === 'This frontend origin is not allowed by CORS.') {
    return res.status(403).json({ message: error.message })
  }
  console.error(error)
  return res.status(500).json({ message: 'Something went wrong on the server.' })
})

export default app
