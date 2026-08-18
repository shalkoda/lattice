export type Provenance = {
  conversationEventIds: string[]

  sourceType:
    | "speech"
    | "llm_prompt"
    | "llm_response"
    | "manual"

  speakerId?: string
  timestamp?: number
  excerpt?: string
  confidence?: number
}
