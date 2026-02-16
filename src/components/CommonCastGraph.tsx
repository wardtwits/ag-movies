import { useEffect, useMemo, useRef, useState } from 'react'
import ForceGraph2D, { type ForceGraphMethods, type NodeObject } from 'react-force-graph-2d'
import type { CommonCastGraphData, CommonCastGraphLink, CommonCastGraphNode } from '../features/common-cast/graphModel'

interface CommonCastGraphProps {
  graphData: CommonCastGraphData
  nodeSpacing: number
}

type PositionedNode = CommonCastGraphNode & {
  x?: number
  y?: number
  fx?: number
  fy?: number
  vx?: number
  vy?: number
}

const truncateLabel = (label: string, maxLength: number): string => {
  if (label.length <= maxLength) {
    return label
  }
  return `${label.slice(0, maxLength - 3)}...`
}

export const CommonCastGraph = ({ graphData, nodeSpacing }: CommonCastGraphProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const graphRef = useRef<ForceGraphMethods<PositionedNode, CommonCastGraphLink> | undefined>(undefined)
  const [size, setSize] = useState({ width: 960, height: 560 })

  const pinNode = (node: NodeObject<PositionedNode>) => {
    if (node.x === undefined || node.y === undefined) {
      return
    }

    node.fx = node.x
    node.fy = node.y
    node.vx = 0
    node.vy = 0
  }

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect
      if (!next) {
        return
      }
      setSize({
        width: Math.max(460, Math.floor(next.width)),
        height: Math.max(420, Math.floor(next.height)),
      })
    })
    observer.observe(containerRef.current)

    return () => observer.disconnect()
  }, [])

  const positionedGraphData = useMemo(() => {
    const anchorDistance = Math.max(160, Math.floor(size.width * 0.3))
    const nodes: PositionedNode[] = graphData.nodes.map((node) => {
      if (node.kind === 'left-title') {
        return {
          ...node,
          x: -anchorDistance,
          y: 0,
          fx: -anchorDistance,
          fy: 0,
          vx: 0,
          vy: 0,
        }
      }
      if (node.kind === 'right-title') {
        return {
          ...node,
          x: anchorDistance,
          y: 0,
          fx: anchorDistance,
          fy: 0,
          vx: 0,
          vy: 0,
        }
      }
      return { ...node }
    })

    return {
      nodes,
      links: graphData.links.map((link) => ({ ...link })),
    }
  }, [graphData, size.width])

  useEffect(() => {
    if (!positionedGraphData.nodes.length) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      graphRef.current?.zoomToFit(650, 90)
      graphRef.current?.d3ReheatSimulation()
    }, 200)
    return () => window.clearTimeout(timeoutId)
  }, [positionedGraphData])

  useEffect(() => {
    if (!positionedGraphData.nodes.length || !graphRef.current) {
      return
    }

    const chargeForce = graphRef.current.d3Force('charge') as
      | { strength?: (value: number) => unknown; distanceMax?: (value: number) => unknown }
      | undefined
    const linkForce = graphRef.current.d3Force('link') as { distance?: (value: number) => unknown } | undefined

    chargeForce?.strength?.(-95 * nodeSpacing)
    chargeForce?.distanceMax?.(860 * nodeSpacing)
    linkForce?.distance?.(82 * nodeSpacing)
    graphRef.current.d3ReheatSimulation()
  }, [nodeSpacing, positionedGraphData.nodes.length, positionedGraphData.links.length])

  const nodeCanvasObject = useMemo(
    () => (node: NodeObject<PositionedNode>, context: CanvasRenderingContext2D, globalScale: number) => {
      const graphNode = node as unknown as PositionedNode
      const x = node.x ?? 0
      const y = node.y ?? 0
      const baseRadius = graphNode.kind === 'actor' ? 8 : 17
      const radius = Math.max(5, baseRadius / Math.pow(globalScale, 0.15))

      if (graphNode.kind !== 'actor') {
        context.shadowColor = graphNode.color
        context.shadowBlur = 18
      }
      context.beginPath()
      context.arc(x, y, radius, 0, 2 * Math.PI, false)
      context.fillStyle = graphNode.color
      context.fill()
      context.shadowBlur = 0
      context.lineWidth = 1.5
      context.strokeStyle = 'rgba(255, 255, 255, 0.7)'
      context.stroke()

      const fontSize = graphNode.kind === 'actor' ? 8 : 11
      context.font = `${fontSize}px "Sora", sans-serif`
      context.fillStyle = '#f4f8ff'
      context.textAlign = 'left'
      context.textBaseline = 'middle'
      context.fillText(truncateLabel(graphNode.label, graphNode.kind === 'actor' ? 18 : 25), x + radius + 5, y)
    },
    [],
  )

  return (
    <div className="graph-shell" ref={containerRef}>
      <ForceGraph2D
        ref={graphRef}
        graphData={positionedGraphData}
        width={size.width}
        height={size.height}
        backgroundColor="rgba(0,0,0,0)"
        nodeLabel={(node) => (node as unknown as PositionedNode).tooltip}
        nodeVal={(node) => (node as unknown as PositionedNode).value}
        nodeCanvasObject={nodeCanvasObject}
        linkColor={(link) => (link as unknown as CommonCastGraphLink).color}
        linkWidth={(link) => (link as unknown as CommonCastGraphLink).strength}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={2.4}
        linkDirectionalParticleColor={(link) => (link as unknown as CommonCastGraphLink).color}
        d3AlphaDecay={0.045}
        d3VelocityDecay={0.26}
        cooldownTicks={130}
        onNodeDragEnd={(node) => {
          pinNode(node)
          graphRef.current?.d3ReheatSimulation()
        }}
        onNodeClick={(node) => {
          if (node.x === undefined || node.y === undefined) {
            return
          }
          graphRef.current?.centerAt(node.x, node.y, 500)
          graphRef.current?.zoom(2.6, 450)
        }}
      />
    </div>
  )
}
