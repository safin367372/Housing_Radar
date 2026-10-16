import 'dotenv/config'
import mongoose from 'mongoose'
import app from './app.js'

const port = Number(process.env.PORT) || 5000

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is missing. Copy .env.example to .env and configure MongoDB.')
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters.')
}

try {
  await mongoose.connect(process.env.MONGODB_URI)
  console.log('Connected to MongoDB.')
  app.listen(port, () => console.log('HousingRadar API listening on port ' + port + '.'))
} catch (error) {
  console.error('Could not start the API:', error.message)
  process.exit(1)
}
