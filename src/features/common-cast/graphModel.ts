import type { CommonCastResult, SharedActor, SharedActorRoleCategory } from './types'

export interface CommonCastGraphNode {
  id: string
  label: string
  kind: 'left-title' | 'right-title' | 'actor'
  color: string
  tooltip: string
  value: number
}

export interface CommonCastGraphLink {
  source: string
  target: string
  color: string
  strength: number
}

export interface CommonCastGraphData {
  nodes: CommonCastGraphNode[]
  links: CommonCastGraphLink[]
}

const LEFT_TITLE_COLOR = '#ff7a45'
const RIGHT_TITLE_COLOR = '#25a2ff'

const ACTOR_CATEGORY_COLORS: Record<SharedActorRoleCategory, string> = {
  'star-both': '#ffd43b',
  mixed: '#4dabf7',
  'extra-both': '#69db7c',
}

const ACTOR_CATEGORY_LABELS: Record<SharedActorRoleCategory, string> = {
  'star-both': 'Star on both',
  mixed: 'Star on one title',
  'extra-both': 'Extra/supporting on both',
}

const formatActorTooltip = (actor: SharedActor): string => {
  const leftRole = actor.leftCharacter ? `Left role: ${actor.leftCharacter}` : 'Left role: n/a'
  const rightRole = actor.rightCharacter ? `Right role: ${actor.rightCharacter}` : 'Right role: n/a'
  const significance = `Node class: ${ACTOR_CATEGORY_LABELS[actor.roleCategory]}`
  return `${actor.name}\n${significance}\n${leftRole}\n${rightRole}`
}

export const buildCommonCastGraph = (result: CommonCastResult): CommonCastGraphData => {
  const leftId = `${result.left.media.mediaType}-${result.left.media.id}-left`
  const rightId = `${result.right.media.mediaType}-${result.right.media.id}-right`

  const nodes: CommonCastGraphNode[] = [
    {
      id: leftId,
      label: result.left.media.title,
      kind: 'left-title',
      color: LEFT_TITLE_COLOR,
      tooltip: `${result.left.media.title} (${result.left.media.mediaType.toUpperCase()})`,
      value: 28,
    },
    {
      id: rightId,
      label: result.right.media.title,
      kind: 'right-title',
      color: RIGHT_TITLE_COLOR,
      tooltip: `${result.right.media.title} (${result.right.media.mediaType.toUpperCase()})`,
      value: 28,
    },
  ]

  const links: CommonCastGraphLink[] = []

  result.sharedActors.forEach((actor) => {
    const actorId = `person-${actor.id}`
    nodes.push({
      id: actorId,
      label: actor.name,
      kind: 'actor',
      color: ACTOR_CATEGORY_COLORS[actor.roleCategory],
      tooltip: formatActorTooltip(actor),
      value: 10 + Math.min(14, Math.log1p(actor.popularity)),
    })
    links.push(
      {
        source: leftId,
        target: actorId,
        color: 'rgba(255, 122, 69, 0.62)',
        strength: 1.6,
      },
      {
        source: rightId,
        target: actorId,
        color: 'rgba(37, 162, 255, 0.62)',
        strength: 1.6,
      },
    )
  })

  return { nodes, links }
}
