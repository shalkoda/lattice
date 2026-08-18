import type { ConversationEvent, ArchitectureEvent } from '@lattice/domain'
import { getPool } from '../db/client.js'

export class EventStore {
  async createSession(title?: string): Promise<string> {
    const pool = getPool()
    const result = await pool.query(
      'INSERT INTO sessions (title) VALUES ($1) RETURNING id',
      [title || 'Untitled Session']
    )
    return result.rows[0].id
  }

  async getSession(sessionId: string): Promise<{ id: string; title: string; created_at: string } | null> {
    const pool = getPool()
    const result = await pool.query(
      'SELECT id, title, created_at FROM sessions WHERE id = $1',
      [sessionId]
    )
    return result.rows[0] || null
  }

  async saveConversationEvents(events: ConversationEvent[]): Promise<void> {
    if (events.length === 0) return

    const pool = getPool()
    const values = events.map((e, idx) => {
      const base = idx * 7
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
    }).join(',')

    const params = events.flatMap(e => [
      e.id,
      e.sessionId,
      e.sourceType,
      e.speakerId || null,
      e.timestampStart || null,
      e.timestampEnd || null,
      e.content
    ])

    await pool.query(
      `INSERT INTO conversation_events
       (id, session_id, source_type, speaker_id, timestamp_start, timestamp_end, content)
       VALUES ${values}
       ON CONFLICT (id) DO NOTHING`,
      params
    )
  }

  async getConversationEvents(sessionId: string): Promise<ConversationEvent[]> {
    const pool = getPool()
    const result = await pool.query(
      `SELECT id, session_id as "sessionId", source_type as "sourceType",
              speaker_id as "speakerId", timestamp_start as "timestampStart",
              timestamp_end as "timestampEnd", content, created_at as "createdAt"
       FROM conversation_events
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    )
    return result.rows
  }

  async saveArchitectureEvents(events: ArchitectureEvent[]): Promise<void> {
    if (events.length === 0) return

    const pool = getPool()
    const values = events.map((e, idx) => {
      const base = idx * 5
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
    }).join(',')

    const params = events.flatMap(e => [
      e.id,
      e.sessionId,
      e.type,
      JSON.stringify(e.payload),
      JSON.stringify(e.provenance)
    ])

    await pool.query(
      `INSERT INTO architecture_events
       (id, session_id, type, payload_json, provenance_json)
       VALUES ${values}
       ON CONFLICT (id) DO NOTHING`,
      params
    )
  }

  async getArchitectureEvents(sessionId: string): Promise<ArchitectureEvent[]> {
    const pool = getPool()
    const result = await pool.query(
      `SELECT id, session_id as "sessionId", type,
              payload_json as payload, provenance_json as provenance,
              created_at as "createdAt"
       FROM architecture_events
       WHERE session_id = $1
       ORDER BY created_at ASC`,
      [sessionId]
    )
    return result.rows
  }

  async listSessions(limit: number = 10): Promise<Array<{ id: string; title: string; created_at: string }>> {
    const pool = getPool()
    const result = await pool.query(
      'SELECT id, title, created_at FROM sessions ORDER BY created_at DESC LIMIT $1',
      [limit]
    )
    return result.rows
  }
}

export const eventStore = new EventStore()
