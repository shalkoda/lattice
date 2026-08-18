import { useState, useRef, useEffect } from 'react'
import { useArchitectureStore } from '../store/architecture'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws/audio'

interface Transcription {
  id: string
  speaker: string
  text: string
  isFinal: boolean
}

export function AudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [status, setStatus] = useState<string>('Ready')

  const sessionId = useArchitectureStore((state) => state.sessionId)
  const wsRef = useRef<WebSocket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const startRecording = async () => {
    if (!sessionId) {
      setStatus('Error: No session')
      return
    }

    try {
      //Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Connect to WebSocket
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        setStatus('Connecting...')
        // Send start message with session ID
        ws.send(JSON.stringify({ type: 'start', sessionId }))
      }

      ws.onmessage = (event) => {
        const message = JSON.parse(event.data)

        if (message.type === 'ready') {
          setStatus('Recording...')
          setIsRecording(true)

          // Start recording audio
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: 'audio/webm',
          })
          mediaRecorderRef.current = mediaRecorder

          mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
              // Send audio data to server
              ws.send(e.data)
            }
          }

          // Send audio chunks every 250ms
          mediaRecorder.start(250)
        } else if (message.type === 'transcription') {
          const transcription: Transcription = message.data
          setTranscriptions((prev) => {
            // Update or add transcription
            const existing = prev.find((t) => t.id === transcription.id)
            if (existing) {
              return prev.map((t) =>
                t.id === transcription.id ? transcription : t
              )
            }
            return [...prev, transcription]
          })
        } else if (message.type === 'error') {
          setStatus(`Error: ${message.error}`)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus('Connection error')
      }

      ws.onclose = () => {
        setStatus('Disconnected')
        setIsRecording(false)
      }
    } catch (error: any) {
      console.error('Error starting recording:', error)
      setStatus(`Error: ${error.message}`)
    }
  }

  const stopRecording = () => {
    // Stop media recorder
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      mediaRecorderRef.current = null
    }

    // Stop microphone stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }))
      wsRef.current.close()
      wsRef.current = null
    }

    setIsRecording(false)
    setStatus('Stopped')
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2>Audio Recording</h2>
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong> {status}
      </div>
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            backgroundColor: isRecording ? '#dc3545' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
          }}
          disabled={!sessionId}
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>
      </div>
      <div>
        <h3>Transcriptions:</h3>
        <div style={{ maxHeight: '300px', overflow: 'auto' }}>
          {transcriptions.map((t) => (
            <div
              key={t.id}
              style={{
                padding: '8px',
                margin: '4px 0',
                backgroundColor: t.isFinal ? '#e8f5e9' : '#f5f5f5',
                borderRadius: '4px',
              }}
            >
              <strong>{t.speaker}:</strong> {t.text}
              {!t.isFinal && <em> (interim)</em>}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
