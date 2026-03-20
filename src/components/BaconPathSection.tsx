import { Fragment } from 'react'
import type { BaconLawResult } from '../features/bacon-law/types'
import { LinkIcon } from './LinkIcon'

const tmdbMovieHref = (mediaType: 'movie' | 'tv', id: number): string =>
  `https://www.themoviedb.org/${mediaType === 'tv' ? 'tv' : 'movie'}/${id}`

const tmdbPersonHref = (id: number): string => `https://www.themoviedb.org/person/${id}`
const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300'
const POSTER_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342'
const FILM_ROLL_IMAGE_URL = '/images/film-roll.png'

interface BaconPathSectionProps {
  isLoading: boolean
  errorMessage: string | null
  result: BaconLawResult | null
  showCopyResultsLink: boolean
  copyResultsLinkLabel: string
  onCopyResultsLink: () => void
}

const getProfileImageUrl = (path?: string | null): string | null => (path ? `${PROFILE_IMAGE_BASE_URL}${path}` : null)
const getPosterImageUrl = (path?: string | null): string | null => (path ? `${POSTER_IMAGE_BASE_URL}${path}` : null)

const getInitials = (label: string): string =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'

const getMediaMeta = (mediaType: 'movie' | 'tv', releaseDate?: string): string => {
  const typeLabel = mediaType === 'tv' ? 'TV' : 'Film'
  const year = releaseDate?.slice(0, 4)
  return year ? `${typeLabel} • ${year}` : typeLabel
}

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

export const BaconPathSection = ({
  isLoading,
  errorMessage,
  result,
  showCopyResultsLink,
  copyResultsLinkLabel,
  onCopyResultsLink,
}: BaconPathSectionProps) => {
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
      <div className="bacon-header">
        {showCopyResultsLink ? (
          <div className="bacon-share-row">
            <button type="button" className="results-share-button" onClick={onCopyResultsLink}>
              <LinkIcon className="action-link-icon" />
              <span>{copyResultsLinkLabel}</span>
            </button>
          </div>
        ) : null}

        <div className="bacon-degree-summary">
          <div className={`bacon-degree ${getDegreeAccentClassName(result.degree)}`}>{result.degree}</div>
          <p className="bacon-degree-label">{getDegreeLabel(result.degree)}</p>
        </div>
      </div>

      {result.steps.length ? (
        <div className="bacon-filmstrip">
          <div className={`bacon-track${result.degree < 3 ? ' bacon-track-compact' : ''}`}>
            <img src={FILM_ROLL_IMAGE_URL} alt="" className="bacon-reel" aria-hidden="true" />

            <div
              className={`bacon-chain${result.degree < 3 ? ' bacon-chain-compact' : ''}`}
              role="list"
              aria-label="Kevin Bacon connection path"
            >
              <a
                href={tmdbPersonHref(result.actor.person.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="bacon-person-node bacon-person-node-large"
                role="listitem"
              >
                <span className="actor-spotlight-portrait-shell bacon-person-medallion">
                  {getProfileImageUrl(result.actor.person.profilePath) ? (
                    <img src={getProfileImageUrl(result.actor.person.profilePath) ?? undefined} alt="" className="actor-spotlight-portrait" />
                  ) : (
                    <span className="actor-spotlight-fallback" aria-hidden="true">
                      {getInitials(result.actor.person.name)}
                    </span>
                  )}
                </span>
                <span className="bacon-person-name">{result.actor.person.name}</span>
              </a>

              {result.steps.map((step, index) => {
                const isFinalStep = index === result.steps.length - 1

                return (
                  <Fragment key={`${step.media.mediaType}-${step.media.id}-${index}`}>
                    <span className="bacon-chain-arrow" aria-hidden="true">
                      →
                    </span>
                    <a
                      href={tmdbMovieHref(step.media.mediaType, step.media.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bacon-media-node"
                      role="listitem"
                    >
                      <span className="bacon-media-frame">
                        {getPosterImageUrl(step.media.posterPath) ? (
                          <img src={getPosterImageUrl(step.media.posterPath) ?? undefined} alt="" className="bacon-media-image" />
                        ) : (
                          <span className="bacon-media-fallback" aria-hidden="true">
                            {getInitials(step.media.title)}
                          </span>
                        )}
                      </span>
                      <span className="bacon-media-title">{step.media.title}</span>
                      <span className="bacon-media-meta">{getMediaMeta(step.media.mediaType, step.media.releaseDate)}</span>
                    </a>
                    <span className="bacon-chain-arrow" aria-hidden="true">
                      →
                    </span>
                    <a
                      href={tmdbPersonHref(step.toActor.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`bacon-person-node ${isFinalStep ? 'bacon-person-node-large' : 'bacon-person-node-bridge'}`}
                      role="listitem"
                    >
                      <span className="actor-spotlight-portrait-shell bacon-person-medallion">
                        {getProfileImageUrl(step.toActor.profilePath) ? (
                          <img src={getProfileImageUrl(step.toActor.profilePath) ?? undefined} alt="" className="actor-spotlight-portrait" />
                        ) : (
                          <span className="actor-spotlight-fallback" aria-hidden="true">
                            {getInitials(step.toActor.name)}
                          </span>
                        )}
                      </span>
                      <span className="bacon-person-name">{step.toActor.name}</span>
                    </a>
                  </Fragment>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="bacon-endpoint-only">
          <a
            href={tmdbPersonHref(result.actor.person.id)}
            target="_blank"
            rel="noopener noreferrer"
            className="bacon-person-node bacon-person-node-large"
          >
            <span className="actor-spotlight-portrait-shell bacon-person-medallion">
              {getProfileImageUrl(result.actor.person.profilePath) ? (
                <img src={getProfileImageUrl(result.actor.person.profilePath) ?? undefined} alt="" className="actor-spotlight-portrait" />
              ) : (
                <span className="actor-spotlight-fallback" aria-hidden="true">
                  {getInitials(result.actor.person.name)}
                </span>
              )}
            </span>
            <span className="bacon-person-name">{result.actor.person.name}</span>
          </a>
        </div>
      )}
    </section>
  )
}
