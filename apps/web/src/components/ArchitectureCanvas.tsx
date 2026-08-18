import { useEffect, useRef } from 'react'
import cytoscape, { Core, NodeSingular, EdgeSingular } from 'cytoscape'
import dagre from 'cytoscape-dagre'
import { useArchitectureStore } from '../store/architecture'
import './ArchitectureCanvas.css'

// Register the dagre layout
cytoscape.use(dagre)

export function ArchitectureCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<Core | null>(null)
  const { currentState } = useArchitectureStore()

  // Initialize Cytoscape
  useEffect(() => {
    if (!containerRef.current) return

    const cy = cytoscape({
      container: containerRef.current,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#4a90e2',
            'label': 'data(label)',
            'color': '#fff',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'width': '60px',
            'height': '60px',
            'border-width': '2px',
            'border-color': '#357abd',
            'border-style': 'solid'
          }
        },
        {
          selector: 'node[status="proposed"]',
          style: {
            'border-style': 'dashed',
            'opacity': 0.7
          }
        },
        {
          selector: 'node[kind="database"]',
          style: {
            'background-color': '#e85d75',
            'border-color': '#c74a61',
            'shape': 'barrel'
          }
        },
        {
          selector: 'node[kind="cache"]',
          style: {
            'background-color': '#f39c12',
            'border-color': '#d68910',
            'shape': 'ellipse'
          }
        },
        {
          selector: 'node[kind="queue"]',
          style: {
            'background-color': '#9b59b6',
            'border-color': '#7d3c98',
            'shape': 'diamond'
          }
        },
        {
          selector: 'node[kind="client"]',
          style: {
            'background-color': '#2ecc71',
            'border-color': '#27ae60',
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'node[kind="service"]',
          style: {
            'background-color': '#4a90e2',
            'border-color': '#357abd',
            'shape': 'round-rectangle'
          }
        },
        {
          selector: 'node[kind="external"]',
          style: {
            'background-color': '#95a5a6',
            'border-color': '#7f8c8d',
            'shape': 'hexagon'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': '#555',
            'target-arrow-color': '#555',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '10px',
            'color': '#888',
            'text-rotation': 'autorotate'
          }
        },
        {
          selector: 'edge[status="proposed"]',
          style: {
            'line-style': 'dashed',
            'opacity': 0.7
          }
        }
      ],
      layout: {
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 50,
        rankSep: 100
      } as any
    })

    cyRef.current = cy

    return () => {
      cy.destroy()
    }
  }, [])

  // Update graph when architecture state changes
  useEffect(() => {
    if (!cyRef.current) return

    const cy = cyRef.current

    // Convert architecture state to Cytoscape elements
    const nodes = Object.values(currentState.nodes).map(node => ({
      data: {
        id: node.id,
        label: node.label,
        kind: node.kind,
        status: node.status,
        technology: node.technology
      }
    }))

    const edges = Object.values(currentState.edges).map(edge => ({
      data: {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        label: edge.label || '',
        kind: edge.kind,
        status: edge.status
      }
    }))

    // Clear existing elements
    cy.elements().remove()

    // Add new elements
    if (nodes.length > 0 || edges.length > 0) {
      cy.add([...nodes, ...edges])

      // Run layout
      cy.layout({
        name: 'dagre',
        rankDir: 'TB',
        nodeSep: 50,
        rankSep: 100
      } as any).run()

      // Fit to viewport
      cy.fit(undefined, 50)
    }
  }, [currentState])

  return (
    <div className="architecture-canvas">
      <div className="canvas-header">
        <h2>Architecture</h2>
        <div className="node-count">
          {Object.keys(currentState.nodes).length} components •{' '}
          {Object.keys(currentState.edges).length} connections
        </div>
      </div>
      <div ref={containerRef} className="cytoscape-container" />
      {Object.keys(currentState.nodes).length === 0 && (
        <div className="empty-state">
          <p>No architecture yet</p>
          <p>Start by describing your system in the transcript panel</p>
        </div>
      )}
    </div>
  )
}
