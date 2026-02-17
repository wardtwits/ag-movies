import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { CommonCastGraphData, CommonCastGraphLink } from '../features/common-cast/graphModel'

interface CommonCastGraphProps {
  graphData: CommonCastGraphData
  nodeSpacing: number
}

interface Point {
  x: number
  y: number
}

interface DragState {
  nodeId: string
  pointerOffsetX: number
  pointerOffsetY: number
}

const GOLDEN_ANGLE_RADIANS = 2.399963229728653

const truncateLabel = (label: string, maxLength: number): string => {
  if (label.length <= maxLength) {
    return label
  }
  return `${label.slice(0, maxLength - 3)}...`
}

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

const toNodeId = (value: CommonCastGraphLink['source'] | CommonCastGraphLink['target']): string =>
  typeof value === 'string' ? value : String(value)

const buildLinkPath = (source: Point, target: Point): string => {
  const dx = target.x - source.x
  const c1x = source.x + dx * 0.35
  const c2x = source.x + dx * 0.7
  const curve = Math.sign(dx || 1) * 26
  return `M ${source.x} ${source.y} C ${c1x} ${source.y - curve}, ${c2x} ${target.y + curve}, ${target.x} ${target.y}`
}

export const CommonCastGraph = ({ graphData, nodeSpacing }: CommonCastGraphProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: 980, height: 560 })
  const [manualPositions, setManualPositions] = useState<Record<string, Point>>({})
  const [dragState, setDragState] = useState<DragState | null>(null)

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
        width: Math.max(520, Math.floor(next.width)),
        height: Math.max(420, Math.floor(next.height)),
      })
    })

    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const leftAnchorNode = useMemo(
    () => graphData.nodes.find((node) => node.kind === 'left-title') ?? null,
    [graphData.nodes],
  )

  const rightAnchorNode = useMemo(
    () => graphData.nodes.find((node) => node.kind === 'right-title') ?? null,
    [graphData.nodes],
  )

  const sharedNodes = useMemo(
    () => graphData.nodes.filter((node) => node.kind !== 'left-title' && node.kind !== 'right-title'),
    [graphData.nodes],
  )

  const anchorPositions = useMemo(
    () => ({
      left: {
        x: Math.round(size.width * 0.23),
        y: Math.round(size.height * 0.5),
      },
      right: {
        x: Math.round(size.width * 0.77),
        y: Math.round(size.height * 0.5),
      },
      center: {
        x: Math.round(size.width * 0.5),
        y: Math.round(size.height * 0.5),
      },
    }),
    [size.height, size.width],
  )

  const generatedPositions = useMemo(() => {
    const positions: Record<string, Point> = {}
    const spread = clamp(nodeSpacing, 0.8, 2.7)

    sharedNodes.forEach((node, index) => {
      const ringMagnitude = Math.sqrt(index + 1)
      const radiusX = Math.min(size.width * 0.29, (30 + ringMagnitude * 28) * spread)
      const radiusY = Math.min(size.height * 0.24, (24 + ringMagnitude * 22) * spread)
      const theta = index * GOLDEN_ANGLE_RADIANS

      positions[node.id] = {
        x: anchorPositions.center.x + Math.cos(theta) * radiusX,
        y: anchorPositions.center.y + Math.sin(theta) * radiusY,
      }
    })

    return positions
  }, [anchorPositions.center.x, anchorPositions.center.y, nodeSpacing, sharedNodes, size.height, size.width])

  useEffect(() => {
    if (!dragState) {
      return
    }

    const onPointerMove = (event: globalThis.PointerEvent) => {
      if (!containerRef.current) {
        return
      }

      const bounds = containerRef.current.getBoundingClientRect()
      const rawX = event.clientX - bounds.left - dragState.pointerOffsetX
      const rawY = event.clientY - bounds.top - dragState.pointerOffsetY

      const clampedPosition: Point = {
        x: clamp(rawX, size.width * 0.08, size.width * 0.92),
        y: clamp(rawY, size.height * 0.1, size.height * 0.9),
      }

      setManualPositions((previous) => ({
        ...previous,
        [dragState.nodeId]: clampedPosition,
      }))
    }

    const onPointerEnd = () => {
      setDragState(null)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerEnd)
    window.addEventListener('pointercancel', onPointerEnd)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerEnd)
      window.removeEventListener('pointercancel', onPointerEnd)
    }
  }, [dragState, size.height, size.width])

  const pointByNodeId = useMemo(() => {
    const points = new Map<string, Point>()

    if (leftAnchorNode) {
      points.set(leftAnchorNode.id, anchorPositions.left)
    }
    if (rightAnchorNode) {
      points.set(rightAnchorNode.id, anchorPositions.right)
    }

    for (const node of sharedNodes) {
      const position = manualPositions[node.id] ?? generatedPositions[node.id]
      if (position) {
        points.set(node.id, position)
      }
    }

    return points
  }, [
    anchorPositions.left,
    anchorPositions.right,
    generatedPositions,
    leftAnchorNode,
    manualPositions,
    rightAnchorNode,
    sharedNodes,
  ])

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, nodeId: string) => {
    if (!containerRef.current) {
      return
    }

    const nodePoint = pointByNodeId.get(nodeId)
    if (!nodePoint) {
      return
    }

    const bounds = containerRef.current.getBoundingClientRect()
    const pointerX = event.clientX - bounds.left
    const pointerY = event.clientY - bounds.top

    setDragState({
      nodeId,
      pointerOffsetX: pointerX - nodePoint.x,
      pointerOffsetY: pointerY - nodePoint.y,
    })
  }

  return (
    <div className="graph-shell magnetic-layout" ref={containerRef}>
      <svg className="magnetic-links" viewBox={`0 0 ${size.width} ${size.height}`} preserveAspectRatio="none" aria-hidden>
        {graphData.links.map((link, index) => {
          const sourceId = toNodeId(link.source)
          const targetId = toNodeId(link.target)
          const sourcePoint = pointByNodeId.get(sourceId)
          const targetPoint = pointByNodeId.get(targetId)

          if (!sourcePoint || !targetPoint) {
            return null
          }

          return (
            <path
              key={`${sourceId}-${targetId}-${index}`}
              d={buildLinkPath(sourcePoint, targetPoint)}
              stroke={link.color}
              strokeWidth={Math.max(1, link.strength * 1.15)}
              strokeLinecap="round"
              fill="none"
            />
          )
        })}
      </svg>

      <div
        className="magnetic-overlap-zone"
        style={{
          left: `${anchorPositions.center.x}px`,
          top: `${anchorPositions.center.y}px`,
        }}
      />

      {leftAnchorNode ? (
        <div
          className="magnetic-anchor magnetic-anchor-left"
          title={leftAnchorNode.tooltip}
          style={{
            left: `${anchorPositions.left.x}px`,
            top: `${anchorPositions.left.y}px`,
            borderColor: leftAnchorNode.color,
          }}
        >
          <span>{truncateLabel(leftAnchorNode.label, 24)}</span>
        </div>
      ) : null}

      {rightAnchorNode ? (
        <div
          className="magnetic-anchor magnetic-anchor-right"
          title={rightAnchorNode.tooltip}
          style={{
            left: `${anchorPositions.right.x}px`,
            top: `${anchorPositions.right.y}px`,
            borderColor: rightAnchorNode.color,
          }}
        >
          <span>{truncateLabel(rightAnchorNode.label, 24)}</span>
        </div>
      ) : null}

      {sharedNodes.map((node) => {
        const position = pointByNodeId.get(node.id)
        if (!position) {
          return null
        }

        return (
          <button
            key={node.id}
            type="button"
            className={`magnetic-node${dragState?.nodeId === node.id ? ' magnetic-node-dragging' : ''}`}
            title={node.tooltip}
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`,
              borderColor: `${node.color}77`,
            }}
            onPointerDown={(event) => handleNodePointerDown(event, node.id)}
          >
            <span className="magnetic-node-dot" style={{ background: node.color }} />
            <span>{truncateLabel(node.label, 24)}</span>
          </button>
        )
      })}
    </div>
  )
}
