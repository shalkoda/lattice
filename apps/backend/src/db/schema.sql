-- Lattice Database Schema

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversation events table
CREATE TABLE IF NOT EXISTS conversation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  speaker_id TEXT,
  timestamp_start BIGINT,
  timestamp_end BIGINT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Architecture events table (event-sourced)
CREATE TABLE IF NOT EXISTS architecture_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  provenance_json JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversation_events_session
  ON conversation_events(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_architecture_events_session
  ON architecture_events(session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_sessions_created
  ON sessions(created_at DESC);
