import type { BaconLawResult } from '../features/bacon-law/types'

const tmdbMovieHref = (mediaType: 'movie' | 'tv', id: number): string =>
  `https://www.themoviedb.org/${mediaType === 'tv' ? 'tv' : 'movie'}/${id}`

const tmdbPersonHref = (id: number): string => `https://www.themoviedb.org/person/${id}`
const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w92'

interface BaconPathSectionProps {
  isLoading: boolean
  errorMessage: string | null
  result: BaconLawResult | null
}

const getProfileImageUrl = (path?: string | null): string | null => (path ? `${PROFILE_IMAGE_BASE_URL}${path}` : null)

const getDegreeLabel = (degree: number): string => {
  if (degree === 0) {
    return 'He is Kevin Bacon.'
  }
  if (degree === 1) {
    return 'degree of separation'
  }
  if (degree === 2) {
    return 'degrees of separation'
  }
  return 'degrees of separation'
}

const getDegreeAccentClassName = (degree: number): string => {
  if (degree === 0) {
    return 'bacon-degree-green'
  }
  if (degree === 1) {
    return 'bacon-degree-blue'
  }
  if (degree === 2) {
    return 'bacon-degree-yellow'
  }
  return 'bacon-degree-red'
}

export const BaconPathSection = ({ isLoading, errorMessage, result }: BaconPathSectionProps) => {
  if (!isLoading && !errorMessage && !result) {
    return null
  }

  if (isLoading) {
    return (
      <section className="bacon-section bacon-loading" aria-live="polite">
        <div className="bacon-spinner" aria-hidden="true" />
        <p>Searching connections…</p>
      </section>
    )
  }

  if (errorMessage) {
    return <section className="bacon-section bacon-error">{errorMessage}</section>
  }

  if (!result) {
    return null
  }

  return (
    <section className="bacon-section" aria-live="polite">
      <div className="bacon-degree-block">
        <div className={`bacon-degree ${getDegreeAccentClassName(result.degree)}`}>{result.degree}</div>
        <p>{getDegreeLabel(result.degree)}</p>
      </div>

      {result.steps.length ? (
        <div className="bacon-chain" role="list" aria-label="Kevin Bacon connection path">
          <a
            href={tmdbPersonHref(result.actor.person.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="bacon-chip bacon-chip-person bacon-chip-endpoint"
            role="listitem"
          >
            {getProfileImageUrl(result.actor.person.profilePath) ? (
              <img src={getProfileImageUrl(result.actor.person.profilePath) ?? undefined} alt="" className="bacon-chip-avatar" />
            ) : null}
            <span className="bacon-chip-label">{result.actor.person.name}</span>
          </a>

          {result.steps.map((step, index) => (
            <div key={`${step.media.mediaType}-${step.media.id}-${index}`} className="bacon-chain-segment" role="listitem">
              <span className="bacon-chain-arrow" aria-hidden="true">
                →
              </span>
              <a
                href={tmdbMovieHref(step.media.mediaType, step.media.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="bacon-chip bacon-chip-movie"
              >
                🎬 {step.media.title}
              </a>
              <span className="bacon-chain-arrow" aria-hidden="true">
                →
              </span>
              <a
                href={tmdbPersonHref(step.toActor.id)}
                target="_blank"
                rel="noopener noreferrer"
                className={`bacon-chip bacon-chip-person${index === result.steps.length - 1 ? ' bacon-chip-endpoint' : ''}`}
              >
                {getProfileImageUrl(step.toActor.profilePath) ? (
                  <img src={getProfileImageUrl(step.toActor.profilePath) ?? undefined} alt="" className="bacon-chip-avatar" />
                ) : null}
                <span className={index === result.steps.length - 1 ? 'bacon-chip-label' : undefined}>{step.toActor.name}</span>
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="bacon-endpoint-only">
          <a
            href={tmdbPersonHref(result.actor.person.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="bacon-chip bacon-chip-person bacon-chip-endpoint"
          >
            {getProfileImageUrl(result.actor.person.profilePath) ? (
              <img src={getProfileImageUrl(result.actor.person.profilePath) ?? undefined} alt="" className="bacon-chip-avatar" />
            ) : null}
            <span className="bacon-chip-label">{result.actor.person.name}</span>
          </a>
        </div>
      )}
    </section>
  )
}
