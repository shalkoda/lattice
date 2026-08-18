import type {
  ConversationEvent,
  ArchitectureEvent,
  ArchitectureState
} from '@lattice/domain'

export type ExtractionParams = {
  conversationEvents: ConversationEvent[]
  currentState: ArchitectureState
  recentEvents?: ArchitectureEvent[]
}

export interface ArchitectureExtractor {
  extract(params: ExtractionParams): Promise<ArchitectureEvent[]>
}
