import type { BaconLawResult } from '../features/bacon-law/types'

interface PathNode {
  id: string
  label: string
  eyebrow: string
  detail?: string
  tone: 'actor-start' | 'actor-bridge' | 'actor-target' | 'movie' | 'tv'
}

const formatMediaLabel = (mediaType: 'movie' | 'tv'): string => (mediaType === 'movie' ? 'Movie' : 'TV series')

const formatRoleLine = (leftRole?: string, rightRole?: string): string | undefined => {
  if (leftRole && rightRole) {
    return `${leftRole} / ${rightRole}`
  }

  return leftRole ?? rightRole
}

const buildPathNodes = (result: BaconLawResult): PathNode[] => {
  if (result.degree === 0) {
    return [
      {
        id: `actor-${result.actor.person.id}`,
        label: result.actor.person.name,
        eyebrow: 'Degree 0',
        detail: 'Already Kevin Bacon',
        tone: 'actor-target',
      },
    ]
  }

  const nodes: PathNode[] = [
    {
      id: `actor-${result.actor.person.id}`,
      label: result.actor.person.name,
      eyebrow: 'Starting actor',
      tone: 'actor-start',
    },
  ]

  result.steps.forEach((step, index) => {
    nodes.push({
      id: `media-${step.media.mediaType}-${step.media.id}-${index}`,
      label: step.media.title,
      eyebrow: formatMediaLabel(step.media.mediaType),
      detail: formatRoleLine(step.fromCharacter, step.toCharacter),
      tone: step.media.mediaType,
    })

    nodes.push({
      id: `actor-${step.toActor.id}-${index}`,
      label: step.toActor.name,
      eyebrow: index === result.steps.length - 1 ? 'Kevin Bacon' : 'Bridge actor',
      tone: index === result.steps.length - 1 ? 'actor-target' : 'actor-bridge',
    })
  })

  return nodes
}

export const BaconPathGraph = ({ result }: { result: BaconLawResult }) => {
  const pathNodes = buildPathNodes(result)

  return (
    <div className="bacon-shell">
      <div className="bacon-banner">
        <strong>Bacon number: {result.degree}</strong>
        <span>
          {result.degree === 0
            ? `${result.actor.person.name} is Kevin Bacon.`
            : `${result.actor.person.name} connects to Kevin Bacon in ${result.degree} shared credit${result.degree === 1 ? '' : 's'}.`}
        </span>
      </div>

      <div className="bacon-path" aria-label="Degrees of separation path to Kevin Bacon">
        {pathNodes.map((node, index) => (
          <div className="bacon-path-fragment" key={node.id}>
            <article className={`bacon-node bacon-node-${node.tone}`}>
              <span className="bacon-node-eyebrow">{node.eyebrow}</span>
              <strong>{node.label}</strong>
              {node.detail ? <span className="bacon-node-detail">{node.detail}</span> : null}
            </article>
            {index < pathNodes.length - 1 ? <div className="bacon-connector" aria-hidden="true" /> : null}
          </div>
        ))}
      </div>

      {result.steps.length > 0 ? (
        <div className="bacon-step-list">
          {result.steps.map((step, index) => {
            const roleLine = formatRoleLine(step.fromCharacter, step.toCharacter)

            return (
              <article
                key={`${step.fromActor.id}-${step.toActor.id}-${step.media.mediaType}-${step.media.id}-${index}`}
                className="bacon-step-card"
              >
                <span className="bacon-step-index">Step {index + 1}</span>
                <strong>
                  {step.fromActor.name} {'->'} {step.toActor.name}
                </strong>
                <span>
                  {step.media.title} ({formatMediaLabel(step.media.mediaType)})
                </span>
                {roleLine ? <span className="bacon-step-role">{roleLine}</span> : null}
              </article>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
