import { Router } from 'express'
import type { ConversationEvent } from '@lattice/domain'
import { OpenAIExtractor } from '@lattice/extractor'
import { reduceArchitecture } from '@lattice/architecture-core'
import { eventStore } from '../services/event-store.js'

export const extractRouter = Router()

// Initialize OpenAI extractor
const apiKey = process.env.OPENAI_API_KEY
if (!apiKey) {
  console.warn('⚠️  OPENAI_API_KEY not set - extraction will fail')
}
const extractor = apiKey ? new OpenAIExtractor(apiKey) : null

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

    // Verify session exists
    const session = await eventStore.getSession(sessionId)
    if (!session) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Save new conversation events
    await eventStore.saveConversationEvents(conversationEvents)

    // Get all conversation and architecture events for this session
    const allConversationEvents = await eventStore.getConversationEvents(sessionId)
    const allArchitectureEvents = await eventStore.getArchitectureEvents(sessionId)

    // Get current architecture state from events
    const currentState = reduceArchitecture(allArchitectureEvents)

    // Extract new architecture events
    const newArchitectureEvents = await extractor.extract({
      conversationEvents: allConversationEvents,
      currentState,
      recentEvents: allArchitectureEvents.slice(-5)
    })

    // Save new architecture events
    await eventStore.saveArchitectureEvents(newArchitectureEvents)

    // Return new events and updated state
    const updatedArchitectureEvents = await eventStore.getArchitectureEvents(sessionId)
    const updatedState = reduceArchitecture(updatedArchitectureEvents)

    res.json({
      architectureEvents: newArchitectureEvents,
      currentState: updatedState
    })
  } catch (error) {
    console.error('Extract error:', error)
    res.status(500).json({ error: 'Failed to extract architecture' })
  }
})
