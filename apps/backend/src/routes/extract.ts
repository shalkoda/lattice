import { Router } from 'express'
import type { ConversationEvent, ArchitectureEvent } from '@lattice/domain'
import { OpenAIExtractor } from '@lattice/extractor'
import { reduceArchitecture } from '@lattice/architecture-core'

export const extractRouter = Router()

// Initialize OpenAI extractor
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.warn('⚠️  OPENAI_API_KEY not set - extraction will fail')
}
const extractor = apiKey ? new OpenAIExtractor(apiKey) : null

// In-memory state for Break 1 (will be replaced with DB in Break 2)
const sessions: Map<string, {
  conversationEvents: ConversationEvent[]
  architectureEvents: ArchitectureEvent[]
}> = new Map()

// POST /api/extract - Extract architecture from conversation
extractRouter.post('/', async (req, res) => {
  try {
    const { sessionId, conversationEvents } = req.body as {
      sessionId: string
      conversationEvents: ConversationEvent[]
    }

    if (!sessionId || !conversationEvents) {
      return res.status(400).json({ error: 'sessionId and conversationEvents required' })
    }

    if (!extractor) {
      return res.status(500).json({ error: 'Extractor not initialized - check OPENAI_API_KEY' })
    }

    // Get or create session
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {
        conversationEvents: [],
        architectureEvents: []
      })
    }

    const session = sessions.get(sessionId)!

    // Store conversation events
    session.conversationEvents.push(...conversationEvents)

    // Get current architecture state from events
    const currentState = reduceArchitecture(session.architectureEvents)

    // Extract new architecture events
    const newArchitectureEvents = await extractor.extract({
      conversationEvents: session.conversationEvents,
      currentState,
      recentEvents: session.architectureEvents.slice(-5)
    })

    // Store new architecture events
    session.architectureEvents.push(...newArchitectureEvents)

    // Return new events and updated state
    const updatedState = reduceArchitecture(session.architectureEvents)

    res.json({
      architectureEvents: newArchitectureEvents,
      currentState: updatedState
    })
  } catch (error) {
    console.error('Extract error:', error)
    res.status(500).json({ error: 'Failed to extract architecture' })
  }
})

// GET /api/extract/:sessionId - Get current state
extractRouter.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params

  const session = sessions.get(sessionId)

  if (!session) {
    return res.status(404).json({ error: 'Session not found' })
  }

  const currentState = reduceArchitecture(session.architectureEvents)

  res.json({
    conversationEvents: session.conversationEvents,
    architectureEvents: session.architectureEvents,
    currentState
  })
})
