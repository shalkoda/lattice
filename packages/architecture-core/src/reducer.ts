import type {
  ArchitectureState,
  ArchitectureEvent,
  ArchitectureNode,
  ArchitectureEdge
} from '@lattice/domain'

export function reduceArchitecture(events: ArchitectureEvent[]): ArchitectureState {
  const state: ArchitectureState = {
    nodes: {},
    edges: {}
  }

  for (const event of events) {
    applyEvent(state, event)
  }

  return state
}

function applyEvent(state: ArchitectureState, event: ArchitectureEvent): void {
  switch (event.payload.type) {
    case 'NODE_PROPOSED': {
      const { node } = event.payload
      state.nodes[node.id] = { ...node, status: 'proposed' }
      break
    }

    case 'NODE_ACCEPTED': {
      const { nodeId, node } = event.payload
      if (state.nodes[nodeId]) {
        state.nodes[nodeId] = {
          ...state.nodes[nodeId],
          ...node,
          status: 'accepted'
        }
      } else if (node) {
        state.nodes[nodeId] = { ...node as ArchitectureNode, status: 'accepted' }
      }
      break
    }

    case 'NODE_REMOVED': {
      const { nodeId } = event.payload
      delete state.nodes[nodeId]

      Object.keys(state.edges).forEach(edgeId => {
        const edge = state.edges[edgeId]
        if (edge.from === nodeId || edge.to === nodeId) {
          delete state.edges[edgeId]
        }
      })
      break
    }

    case 'EDGE_ADDED': {
      const { edge } = event.payload
      state.edges[edge.id] = edge
      break
    }

    case 'EDGE_REMOVED': {
      const { edgeId } = event.payload
      delete state.edges[edgeId]
      break
    }

    case 'DECISION_RECORDED':
    case 'DECISION_SUPERSEDED':
    case 'QUESTION_RECORDED':
      break
  }
}
