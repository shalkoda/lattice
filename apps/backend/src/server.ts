import dotenv from 'dotenv'
dotenv.config()

import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { extractRouter } from './routes/extract.js'
import { sessionsRouter } from './routes/sessions.js'
import { initializeDatabase } from './db/client.js'
import { setupAudioStreamWebSocket } from './routes/audio-stream.js'

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

    // Create HTTP server
    const server = createServer(app)

    // Setup WebSocket for audio streaming
    setupAudioStreamWebSocket(server)

    server.listen(PORT, () => {
      console.log(`🚀 Backend server running on http://localhost:${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
      console.log(`🎤 WebSocket audio streaming: ws://localhost:${PORT}/ws/audio`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
