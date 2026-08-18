import type { ArchitectureNode, ArchitectureState } from '@lattice/domain'

function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/^(the|a|an)\s+/i, '')
    .replace(/\s+/g, ' ')
}

function getTechnologyHints(node: Partial<ArchitectureNode>): string[] {
  const hints: string[] = []
  const text = `${node.label || ''} ${node.technology || ''}`.toLowerCase()

  const techMap: Record<string, string> = {
    'redis': 'cache',
    'memcached': 'cache',
    'postgres': 'database',
    'postgresql': 'database',
    'mysql': 'database',
    'mongodb': 'database',
    'kafka': 'queue',
    'rabbitmq': 'queue',
    'sqs': 'queue',
    'react': 'client',
    'vue': 'client',
    'angular': 'client',
    'fastapi': 'service',
    'express': 'service',
    'flask': 'service'
  }

  for (const [tech, kind] of Object.entries(techMap)) {
    if (text.includes(tech)) {
      hints.push(kind)
    }
  }

  return hints
}

export function reconcileNode(
  node: Partial<ArchitectureNode>,
  currentState: ArchitectureState
): string | null {
  const normalizedLabel = normalizeLabel(node.label || '')
  const techHints = getTechnologyHints(node)

  for (const [existingId, existingNode] of Object.entries(currentState.nodes)) {
    const existingNormalizedLabel = normalizeLabel(existingNode.label)

    if (normalizedLabel === existingNormalizedLabel) {
      return existingId
    }

    if (
      normalizedLabel.includes(existingNormalizedLabel) ||
      existingNormalizedLabel.includes(normalizedLabel)
    ) {
      if (node.kind && existingNode.kind && node.kind !== existingNode.kind) {
        continue
      }

      if (techHints.length > 0 && techHints.includes(existingNode.kind)) {
        return existingId
      }

      return existingId
    }

    if (node.kind && node.kind === existingNode.kind) {
      const nodeText = normalizedLabel
      const existingText = existingNormalizedLabel

      if (
        nodeText.includes(existingText) ||
        existingText.includes(nodeText) ||
        nodeText.split(/\s+/).some(word =>
          word.length > 3 && existingText.includes(word)
        )
      ) {
        return existingId
      }
    }
  }

  return null
}

export function generateNodeId(node: Partial<ArchitectureNode>): string {
  const normalized = normalizeLabel(node.label || 'unknown')
  const kind = node.kind || 'service'

  const base = `${kind}-${normalized.replace(/\s+/g, '-')}`

  return base
}
