import type { CommonCastGraphData } from '../common-cast/graphModel'
import type { CommonTitlesResult, SharedTitle } from './types'

const LEFT_ACTOR_COLOR = '#ff7a45'
const RIGHT_ACTOR_COLOR = '#25a2ff'
const MOVIE_NODE_COLOR = '#f783ac'
const TV_NODE_COLOR = '#63e6be'

const formatTitleTooltip = (title: SharedTitle): string => {
  const mediaLabel = title.mediaType === 'movie' ? 'Movie' : 'TV'
  const leftRole = title.leftCharacter ? `Actor 1 role: ${title.leftCharacter}` : 'Actor 1 role: n/a'
  const rightRole = title.rightCharacter ? `Actor 2 role: ${title.rightCharacter}` : 'Actor 2 role: n/a'
  return `${title.title} (${mediaLabel})\n${leftRole}\n${rightRole}`
}

export const buildCommonTitlesGraph = (result: CommonTitlesResult): CommonCastGraphData => {
  const leftId = `person-${result.left.person.id}-left`
  const rightId = `person-${result.right.person.id}-right`

  const nodes: CommonCastGraphData['nodes'] = [
    {
      id: leftId,
      label: result.left.person.name,
      kind: 'left-title',
      color: LEFT_ACTOR_COLOR,
      tooltip: `${result.left.person.name} (Actor 1)`,
      value: 28,
    },
    {
      id: rightId,
      label: result.right.person.name,
      kind: 'right-title',
      color: RIGHT_ACTOR_COLOR,
      tooltip: `${result.right.person.name} (Actor 2)`,
      value: 28,
    },
  ]

  const links: CommonCastGraphData['links'] = []

  for (const sharedTitle of result.sharedTitles) {
    const titleId = `${sharedTitle.mediaType}-${sharedTitle.id}`
    nodes.push({
      id: titleId,
      label: sharedTitle.title,
      kind: 'title',
      color: sharedTitle.mediaType === 'movie' ? MOVIE_NODE_COLOR : TV_NODE_COLOR,
      tooltip: formatTitleTooltip(sharedTitle),
      value: 9 + Math.min(14, Math.log1p(sharedTitle.popularity) + Math.log1p(sharedTitle.voteCount)),
    })

    links.push(
      {
        source: leftId,
        target: titleId,
        color: 'rgba(255, 122, 69, 0.62)',
        strength: 1.5,
      },
      {
        source: rightId,
        target: titleId,
        color: 'rgba(37, 162, 255, 0.62)',
        strength: 1.5,
      },
    )
  }

  return { nodes, links }
}
