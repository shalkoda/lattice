import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { extractRouter } from './routes/extract.js'
import { sessionsRouter } from './routes/sessions.js'
import { initializeDatabase } from './db/client.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Routes
app.use('/api/sessions', sessionsRouter)
app.use('/api/extract', extractRouter)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Initialize database and start server
async function start() {
  try {
    await initializeDatabase()

    app.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
