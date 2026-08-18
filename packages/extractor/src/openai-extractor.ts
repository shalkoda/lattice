import OpenAI from 'openai'
import type { ArchitectureExtractor, ExtractionParams } from './interface.js'
import type { ArchitectureEvent, ArchitectureNode, ArchitectureEdge } from '@lattice/domain'
import { randomUUID } from 'crypto'

export class OpenAIExtractor implements ArchitectureExtractor {
  private client: OpenAI
  private model: string

  constructor(apiKey: string, model: string = 'gpt-4o-mini') {
    this.client = new OpenAI({ apiKey })
    this.model = model
  }

  async extract(params: ExtractionParams): Promise<ArchitectureEvent[]> {
    const { conversationEvents, currentState } = params

    // Build the prompt
    const prompt = this.buildPrompt(conversationEvents, currentState)

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        return []
      }

      const result = JSON.parse(content) as ExtractionResult
      return this.convertToEvents(result, conversationEvents)
    } catch (error) {
      console.error('OpenAI extraction error:', error)
      return []
    }
  }

  private buildPrompt(conversationEvents: any[], currentState: any): string {
    const conversation = conversationEvents
      .map(e => `${e.speakerId || 'User'}: ${e.content}`)
      .join('\n')

    const existingNodes = Object.values(currentState.nodes || {})
      .map((n: any) => `- ${n.label} (${n.kind}, ${n.status})`)
      .join('\n')

    return `# Current Architecture
${existingNodes.length > 0 ? existingNodes : 'No existing components'}

# Conversation
${conversation}

Extract any architecture components and relationships discussed.`
  }

  private convertToEvents(
    result: ExtractionResult,
    conversationEvents: any[]
  ): ArchitectureEvent[] {
    const events: ArchitectureEvent[] = []
    const sessionId = conversationEvents[0]?.sessionId || 'default'
    const eventIds = conversationEvents.map(e => e.id)

    // Create provenance
    const provenance = {
      conversationEventIds: eventIds,
      sourceType: 'llm_response' as const,
      timestamp: Date.now(),
      excerpt: conversationEvents[0]?.content?.substring(0, 100)
    }

    // Add nodes
    for (const node of result.nodes || []) {
      events.push({
        id: randomUUID(),
        sessionId,
        type: node.status === 'proposed' ? 'NODE_PROPOSED' : 'NODE_ACCEPTED',
        payload: {
          type: node.status === 'proposed' ? 'NODE_PROPOSED' : 'NODE_ACCEPTED',
          ...(node.status === 'proposed'
            ? { node: node as ArchitectureNode }
            : { nodeId: node.id, node: node as ArchitectureNode })
        } as any,
        provenance,
        createdAt: new Date().toISOString()
      })
    }

    // Add edges
    for (const edge of result.edges || []) {
      events.push({
        id: randomUUID(),
        sessionId,
        type: 'EDGE_ADDED',
        payload: {
          type: 'EDGE_ADDED',
          edge: edge as ArchitectureEdge
        },
        provenance,
        createdAt: new Date().toISOString()
      })
    }

    return events
  }
}

const SYSTEM_PROMPT = `You are an architecture extraction assistant. Your job is to analyze engineering conversations and extract structured architecture information.

RULES:
1. Extract ONLY architecture components (databases, services, clients, caches, queues, external systems)
2. Extract relationships/connections between components
3. For Break 1, mark everything as "accepted" (we'll add proposal detection in Break 3)
4. Generate stable IDs: use format "{kind}-{normalized-label}" (e.g., "database-postgres", "service-fastapi")
5. DO NOT generate Mermaid diagrams, SVG, or layout coordinates
6. Output ONLY valid JSON matching the schema below

COMPONENT KINDS:
- client: Frontend applications (React, Vue, mobile apps)
- service: Backend services (APIs, microservices)
- database: Persistent data stores (Postgres, MySQL, MongoDB)
- cache: Caching layers (Redis, Memcached)
- queue: Message queues (Kafka, RabbitMQ, SQS)
- external: External services/APIs

EDGE KINDS:
- request: HTTP/RPC requests
- read_write: Database read/write
- stream: Streaming data
- publish/consume: Message queue patterns
- dependency: General dependencies
- generic: Other relationships

OUTPUT SCHEMA:
{
  "nodes": [
    {
      "id": "service-fastapi",
      "kind": "service",
      "label": "FastAPI",
      "technology": "FastAPI",
      "status": "accepted"
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "from": "client-react",
      "to": "service-fastapi",
      "kind": "request",
      "label": "API calls",
      "status": "accepted"
    }
  ]
}

If no architecture is discussed, return {"nodes": [], "edges": []}.`

type ExtractionResult = {
  nodes?: Array<ArchitectureNode>
  edges?: Array<ArchitectureEdge>
}
