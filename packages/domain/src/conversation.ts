export type ConversationEvent = {
  id: string
  sessionId: string

  sourceType:
    | "speech"
    | "llm_prompt"
    | "llm_response"
    | "manual"

  speakerId?: string
  timestampStart?: number
  timestampEnd?: number

  content: string
  createdAt: string
}
