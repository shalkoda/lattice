import { useState } from 'react'
import { useArchitectureStore } from '../store/architecture'
import './TranscriptPanel.css'

export function TranscriptPanel() {
  const [input, setInput] = useState('')
  const { conversationEvents, addConversation, isLoading } = useArchitectureStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    await addConversation(input.trim(), 'User')
    setInput('')
  }

  return (
    <div className="transcript-panel">
      <div className="transcript-header">
        <h2>Transcript</h2>
        <span className="event-count">{conversationEvents.length} events</span>
      </div>

      <div className="transcript-events">
        {conversationEvents.length === 0 ? (
          <div className="empty-state">
            <p>No conversation yet.</p>
            <p>Type something like: "Let's use React with a FastAPI backend and Postgres"</p>
          </div>
        ) : (
          conversationEvents.map((event) => (
            <div key={event.id} className="conversation-event">
              <div className="event-speaker">{event.speakerId || 'Unknown'}</div>
              <div className="event-content">{event.content}</div>
              <div className="event-time">
                {new Date(event.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>

      <form className="transcript-input" onSubmit={handleSubmit}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your architecture discussion..."
          rows={3}
          disabled={isLoading}
        />
        <button type="submit" disabled={!input.trim() || isLoading}>
          {isLoading ? 'Extracting...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
