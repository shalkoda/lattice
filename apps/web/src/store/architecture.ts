import { create } from 'zustand'
import type {
  ConversationEvent,
  ArchitectureEvent,
  ArchitectureState
} from '@lattice/domain'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

type ArchitectureStore = {
  sessionId: string | null
  conversationEvents: ConversationEvent[]
  architectureEvents: ArchitectureEvent[]
  currentState: ArchitectureState
  isLoading: boolean
  error: string | null

  // Actions
  initialize: () => Promise<void>
  loadSession: (sessionId: string) => Promise<void>
  addConversation: (content: string, speakerId?: string) => Promise<void>
  createNewSession: () => Promise<void>
}

export const useArchitectureStore = create<ArchitectureStore>((set, get) => ({
  sessionId: null,
  conversationEvents: [],
  architectureEvents: [],
  currentState: { nodes: {}, edges: {} },
  isLoading: false,
  error: null,

  initialize: async () => {
    // Check localStorage for existing session
    const savedSessionId = localStorage.getItem('lattice_session_id')

    if (savedSessionId) {
      // Load existing session
      await get().loadSession(savedSessionId)
    } else {
      // Create new session
      await get().createNewSession()
    }
  },

  loadSession: async (sessionId: string) => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch(`${API_URL}/api/sessions/${sessionId}`)

      if (!response.ok) {
        throw new Error('Session not found')
      }

      const data = await response.json()

      set({
        sessionId,
        conversationEvents: data.conversationEvents || [],
        architectureEvents: data.architectureEvents || [],
        currentState: data.currentState || { nodes: {}, edges: {} },
        isLoading: false
      })

      localStorage.setItem('lattice_session_id', sessionId)
    } catch (error) {
      console.error('Load session error:', error)
      // If load fails, create new session
      await get().createNewSession()
    }
  },

  createNewSession: async () => {
    set({ isLoading: true, error: null })

    try {
      const response = await fetch(`${API_URL}/api/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: 'Architecture Session'
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      const sessionId = data.session.id

      set({
        sessionId,
        conversationEvents: [],
        architectureEvents: [],
        currentState: { nodes: {}, edges: {} },
        isLoading: false
      })

      localStorage.setItem('lattice_session_id', sessionId)
    } catch (error) {
      console.error('Create session error:', error)
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  },

  addConversation: async (content: string, speakerId?: string) => {
    const { sessionId } = get()

    if (!sessionId) {
      await get().createNewSession()
      return get().addConversation(content, speakerId)
    }

    // Create a new conversation event
    const newEvent: ConversationEvent = {
      id: crypto.randomUUID(),
      sessionId,
      sourceType: 'manual',
      speakerId,
      content,
      createdAt: new Date().toISOString()
    }

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

      // Reload full session state to get all events
      await get().loadSession(sessionId)
    } catch (error) {
      console.error('Extract error:', error)
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      })
    }
  }
}))
