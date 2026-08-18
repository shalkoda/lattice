import { Router } from 'express'
import { eventStore } from '../services/event-store.js'
import { reduceArchitecture } from '@lattice/architecture-core'

export const sessionsRouter = Router()

// GET /api/sessions - List all sessions
sessionsRouter.get('/', async (req, res) => {
  try {
    const sessions = await eventStore.listSessions()
    res.json({ sessions })
  } catch (error) {
    console.error('List sessions error:', error)
    res.status(500).json({ error: 'Failed to list sessions' })
  }
})

// POST /api/sessions - Create a new session
sessionsRouter.post('/', async (req, res) => {
  try {
    const { title } = req.body
    const sessionId = await eventStore.createSession(title)

    res.json({
      session: {
        id: sessionId,
        title: title || 'Untitled Session',
        created_at: new Date().toISOString()
      }
    })
  } catch (error) {
    console.error('Create session error:', error)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

// GET /api/sessions/:id - Get session details with full state
sessionsRouter.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const session = await eventStore.getSession(id)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    const conversationEvents = await eventStore.getConversationEvents(id)
    const architectureEvents = await eventStore.getArchitectureEvents(id)
    const currentState = reduceArchitecture(architectureEvents)

    res.json({
      session,
      conversationEvents,
      architectureEvents,
      currentState
    })
  } catch (error) {
    console.error('Get session error:', error)
    res.status(500).json({ error: 'Failed to get session' })
  }
})
