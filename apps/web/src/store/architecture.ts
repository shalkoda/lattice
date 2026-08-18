import { create } from 'zustand'
import type {
  ConversationEvent,
  ArchitectureEvent,
  ArchitectureState
} from '@lattice/domain'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

type ArchitectureStore = {
  sessionId: string
  conversationEvents: ConversationEvent[]
  architectureEvents: ArchitectureEvent[]
  currentState: ArchitectureState
  isLoading: boolean
  error: string | null

  // Actions
  addConversation: (content: string, speakerId?: string) => Promise<void>
  reset: () => void
}

export const useArchitectureStore = create<ArchitectureStore>((set, get) => ({
  sessionId: crypto.randomUUID(),
  conversationEvents: [],
  architectureEvents: [],
  currentState: { nodes: {}, edges: {} },
  isLoading: false,
  error: null,

  addConversation: async (content: string, speakerId?: string) => {
    const { sessionId, conversationEvents } = get()

    // Create a new conversation event
    const newEvent: ConversationEvent = {
      id: crypto.randomUUID(),
      sessionId,
      sourceType: 'manual',
      speakerId,
      content,
      createdAt: new Date().toISOString()
    }

    // Optimistically add to local state
    set({ isLoading: true, error: null })

    try {
      // Call backend to extract architecture
      const response = await fetch(`${API_URL}/api/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          conversationEvents: [newEvent]
        })
      })

      if (!response.ok) {
        throw new Error('Failed to extract architecture')
      }

      const data = await response.json()

      // Update state with new events and current state
      set({
        conversationEvents: [...conversationEvents, newEvent],
        architectureEvents: [
          ...get().architectureEvents,
          ...(data.architectureEvents || [])
        ],
        currentState: data.currentState || get().currentState,
        isLoading: false
      })
    } catch (error) {
      console.error('Extract error:', error)
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },

  reset: () => {
    set({
      sessionId: crypto.randomUUID(),
      conversationEvents: [],
      architectureEvents: [],
      currentState: { nodes: {}, edges: {} },
      isLoading: false,
      error: null
    })
  }
}))
