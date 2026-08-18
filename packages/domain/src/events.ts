import type { ArchitectureNode, ArchitectureEdge } from './architecture.js'
import type { Provenance } from './provenance.js'

export type ArchitectureEventType =
  | "NODE_PROPOSED"
  | "NODE_ACCEPTED"
  | "NODE_REMOVED"
  | "EDGE_ADDED"
  | "EDGE_REMOVED"
  | "DECISION_RECORDED"
  | "DECISION_SUPERSEDED"
  | "QUESTION_RECORDED"

export type ArchitectureEvent = {
  id: string
  sessionId: string
  type: ArchitectureEventType
  payload: ArchitectureEventPayload
  provenance: Provenance
  createdAt: string
}

export type ArchitectureEventPayload =
  | NodeProposedPayload
  | NodeAcceptedPayload
  | NodeRemovedPayload
  | EdgeAddedPayload
  | EdgeRemovedPayload
  | DecisionRecordedPayload
  | DecisionSupersededPayload
  | QuestionRecordedPayload

export type NodeProposedPayload = {
  type: "NODE_PROPOSED"
  node: ArchitectureNode
}

export type NodeAcceptedPayload = {
  type: "NODE_ACCEPTED"
  nodeId: string
  node?: Partial<ArchitectureNode>
}

export type NodeRemovedPayload = {
  type: "NODE_REMOVED"
  nodeId: string
  reason?: string
}

export type EdgeAddedPayload = {
  type: "EDGE_ADDED"
  edge: ArchitectureEdge
}

export type EdgeRemovedPayload = {
  type: "EDGE_REMOVED"
  edgeId: string
  reason?: string
}

export type DecisionRecordedPayload = {
  type: "DECISION_RECORDED"
  decision: string
  rationale?: string
  affectedNodeIds?: string[]
}

export type DecisionSupersededPayload = {
  type: "DECISION_SUPERSEDED"
  previousDecisionId: string
  newDecision: string
  rationale?: string
}

export type QuestionRecordedPayload = {
  type: "QUESTION_RECORDED"
  question: string
  context?: string
  relatedNodeIds?: string[]
}
