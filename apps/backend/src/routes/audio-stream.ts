import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { DeepgramSTTService } from '../services/deepgram-stt.js'
import { eventStore } from '../services/event-store.js'
import type { ConversationEvent } from '@lattice/domain'
import { randomUUID } from 'crypto'

interface SessionData {
  sessionId: string
  sttService: DeepgramSTTService
  transcriptions: Map<string, ConversationEvent>
}

const sessions = new Map<WebSocket, SessionData>()

export function setupAudioStreamWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws/audio' })

  wss.on('connection', async (ws: WebSocket) => {
    console.log('🔌 New WebSocket connection for audio streaming')

    // Wait for initial message with session ID
    ws.once('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString())

        if (message.type !== 'start' || !message.sessionId) {
          ws.send(JSON.stringify({ type: 'error', error: 'Invalid start message' }))
          ws.close()
          return
        }

        const sessionId = message.sessionId

        // Verify session exists
        const session = await eventStore.getSession(sessionId)
        if (!session) {
          ws.send(JSON.stringify({ type: 'error', error: 'Session not found' }))
          ws.close()
          return
        }

        // Initialize Deepgram STT
        const deepgramApiKey = process.env.DEEPGRAM_API_KEY
        if (!deepgramApiKey) {
          ws.send(JSON.stringify({ type: 'error', error: 'Deepgram API key not configured' }))
          ws.close()
          return
        }

        const sttService = new DeepgramSTTService(deepgramApiKey)
        const sessionData: SessionData = {
          sessionId,
          sttService,
          transcriptions: new Map(),
        }
        sessions.set(ws, sessionData)

        // Handle transcription events
        sttService.on('transcription', async (event) => {
          // Send interim results to client
          ws.send(JSON.stringify({
            type: 'transcription',
            data: event,
          }))

          // Save final transcriptions
          if (event.isFinal) {
            const conversationEvent: ConversationEvent = {
              id: event.id,
              sessionId,
              sourceType: 'speech',
              speakerId: event.speaker,
              timestampStart: event.timestamp,
              content: event.text,
              createdAt: new Date().toISOString(),
            }

            // Store in memory
            sessionData.transcriptions.set(event.id, conversationEvent)

            // Save to database
            await eventStore.saveConversationEvents([conversationEvent])

            // Notify client
            ws.send(JSON.stringify({
              type: 'saved',
              eventId: event.id,
            }))
          }
        })

        sttService.on('error', (error) => {
          console.error('STT error:', error)
          ws.send(JSON.stringify({ type: 'error', error: error.message }))
        })

        sttService.on('close', () => {
          console.log('🛑 Deepgram connection closed')
        })

        // Start Deepgram connection
        await sttService.start()

        ws.send(JSON.stringify({ type: 'ready' }))

        // Handle incoming audio data
        ws.on('message', (data: Buffer) => {
          if (data instanceof Buffer) {
            // Raw audio data - forward to Deepgram
            sttService.send(data)
          } else {
            // JSON message
            try {
              const message = JSON.parse(data.toString())
              if (message.type === 'stop') {
                handleStop(ws, sessionData)
              }
            } catch (err) {
              // Ignore parse errors for non-JSON messages
            }
          }
        })
      } catch (error: any) {
        console.error('Error setting up audio stream:', error)
        ws.send(JSON.stringify({ type: 'error', error: error.message }))
        ws.close()
      }
    })

    ws.on('close', () => {
      const sessionData = sessions.get(ws)
      if (sessionData) {
        console.log('🔌 WebSocket connection closed')
        sessionData.sttService.stop()
        sessions.delete(ws)
      }
    })

    ws.on('error', (error) => {
      console.error('WebSocket error:', error)
      const sessionData = sessions.get(ws)
      if (sessionData) {
        sessionData.sttService.stop()
        sessions.delete(ws)
      }
    })
  })

  return wss
}

async function handleStop(ws: WebSocket, sessionData: SessionData) {
  await sessionData.sttService.stop()

  // Get all final transcriptions for this session
  const transcriptions = Array.from(sessionData.transcriptions.values())

  ws.send(JSON.stringify({
    type: 'stopped',
    transcriptionCount: transcriptions.length,
  }))
}
