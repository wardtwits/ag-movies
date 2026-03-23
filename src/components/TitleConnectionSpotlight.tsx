import type { MediaTitle } from '../domain/media'
import type { ResultCardData } from './ResultCard'

const POSTER_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342'
const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300'
const FILM_ROLL_IMAGE_URL = '/images/film-roll.png'

interface TitleConnectionSpotlightProps {
  leftTitle: MediaTitle
  rightTitle: MediaTitle
  actors: Array<Pick<ResultCardData, 'id' | 'title' | 'subtitle' | 'href' | 'imagePath'>>
  hideSearchedTitles?: boolean
}

const getPosterImageUrl = (path?: string | null): string | null => (path ? `${POSTER_IMAGE_BASE_URL}${path}` : null)
const getProfileImageUrl = (path?: string | null): string | null => (path ? `${PROFILE_IMAGE_BASE_URL}${path}` : null)

const getMediaHref = (title: MediaTitle): string =>
  `https://www.themoviedb.org/${title.mediaType === 'tv' ? 'tv' : 'movie'}/${title.id}`

const getInitials = (label: string): string =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'

const getYearLabel = (title: MediaTitle): string => title.releaseDate?.slice(0, 4) ?? (title.mediaType === 'tv' ? 'TV' : 'Film')
const getRoleLabel = (subtitle: string): string | null => (subtitle === 'Actor' ? null : subtitle.replace(/^Role:\s*/, ''))

export const TitleConnectionSpotlight = ({
  leftTitle,
  rightTitle,
  actors,
  hideSearchedTitles = false,
}: TitleConnectionSpotlightProps) => {
  return (
    <section className="title-spotlight" aria-label={`Top-billed shared cast for ${leftTitle.title} and ${rightTitle.title}`}>
      <div className="title-spotlight-header">
        <p className="title-spotlight-pairing">
          {leftTitle.title} + {rightTitle.title}
        </p>
      </div>

      <div className="title-spotlight-stage">
        {!hideSearchedTitles ? (
          <a href={getMediaHref(leftTitle)} target="_blank" rel="noopener noreferrer" className="title-spotlight-title-card">
            <span className="title-spotlight-title-frame">
              {getPosterImageUrl(leftTitle.posterPath) ? (
                <img
                  src={getPosterImageUrl(leftTitle.posterPath) ?? undefined}
                  alt=""
                  className="title-spotlight-title-image"
                />
              ) : (
                <span className="title-spotlight-title-fallback" aria-hidden="true">
                  {getInitials(leftTitle.title)}
                </span>
              )}
            </span>
            <span className="title-spotlight-title-copy">
              <span className="title-spotlight-title-name">{leftTitle.title}</span>
              <span className="title-spotlight-title-year">{getYearLabel(leftTitle)}</span>
            </span>
          </a>
        ) : null}

        {actors.length ? (
          <div className="title-spotlight-filmstrip">
            <div className="title-spotlight-filmstrip-label">Top-Billed Shared Cast</div>
            <img src={FILM_ROLL_IMAGE_URL} alt="" className="title-spotlight-reel" aria-hidden="true" />

            <div className="title-spotlight-actors" style={{ gridTemplateColumns: `repeat(${actors.length}, minmax(0, 1fr))` }}>
              {actors.map((actor) => (
                <a
                  key={actor.id}
                  href={actor.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="title-spotlight-actor-card"
                >
                  <span className="actor-spotlight-portrait-shell title-spotlight-portrait-medallion">
                    {getProfileImageUrl(actor.imagePath) ? (
                      <img src={getProfileImageUrl(actor.imagePath) ?? undefined} alt="" className="actor-spotlight-portrait" />
                    ) : (
                      <span className="actor-spotlight-fallback" aria-hidden="true">
                        {getInitials(actor.title)}
                      </span>
                    )}
                  </span>
                  <span className="title-spotlight-actor-name">{actor.title}</span>
                  {getRoleLabel(actor.subtitle) ? (
                    <span className="title-spotlight-actor-role">{getRoleLabel(actor.subtitle)}</span>
                  ) : null}
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {!hideSearchedTitles ? (
          <a href={getMediaHref(rightTitle)} target="_blank" rel="noopener noreferrer" className="title-spotlight-title-card">
            <span className="title-spotlight-title-frame">
              {getPosterImageUrl(rightTitle.posterPath) ? (
                <img
                  src={getPosterImageUrl(rightTitle.posterPath) ?? undefined}
                  alt=""
                  className="title-spotlight-title-image"
                />
              ) : (
                <span className="title-spotlight-title-fallback" aria-hidden="true">
                  {getInitials(rightTitle.title)}
                </span>
              )}
            </span>
            <span className="title-spotlight-title-copy">
              <span className="title-spotlight-title-name">{rightTitle.title}</span>
              <span className="title-spotlight-title-year">{getYearLabel(rightTitle)}</span>
            </span>
          </a>
        ) : null}
      </div>
    </section>
  )
}
