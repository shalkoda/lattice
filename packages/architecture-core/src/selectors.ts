import type { ArchitectureState, ArchitectureNode, ArchitectureEdge } from '@lattice/domain'

export function getAllNodes(state: ArchitectureState): ArchitectureNode[] {
  return Object.values(state.nodes)
}

export function getAllEdges(state: ArchitectureState): ArchitectureEdge[] {
  return Object.values(state.edges)
}

export function getNode(state: ArchitectureState, nodeId: string): ArchitectureNode | undefined {
  return state.nodes[nodeId]
}

export function getConnectedEdges(state: ArchitectureState, nodeId: string): ArchitectureEdge[] {
  return getAllEdges(state).filter(
    edge => edge.from === nodeId || edge.to === nodeId
  )
}

export function getProposedNodes(state: ArchitectureState): ArchitectureNode[] {
  return getAllNodes(state).filter(node => node.status === 'proposed')
}

export function getAcceptedNodes(state: ArchitectureState): ArchitectureNode[] {
  return getAllNodes(state).filter(node => node.status === 'accepted')
}
