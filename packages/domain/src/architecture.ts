export type ArchitectureNode = {
  id: string

  kind:
    | "client"
    | "service"
    | "database"
    | "cache"
    | "queue"
    | "external"

  label: string
  technology?: string

  status:
    | "proposed"
    | "accepted"
    | "deprecated"

  metadata?: Record<string, unknown>
}

export type ArchitectureEdge = {
  id: string
  from: string
  to: string

  kind:
    | "request"
    | "stream"
    | "read_write"
    | "publish"
    | "consume"
    | "dependency"
    | "generic"

  label?: string

  status:
    | "proposed"
    | "accepted"
    | "deprecated"
}

export type ArchitectureState = {
  nodes: Record<string, ArchitectureNode>
  edges: Record<string, ArchitectureEdge>
}
