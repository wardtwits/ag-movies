import type { MediaTitle } from '../domain/media'
import type { ResultCardData } from './ResultCard'

const POSTER_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342'
const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300'

interface TitleConnectionSpotlightProps {
  leftTitle: MediaTitle
  rightTitle: MediaTitle
  actors: Array<Pick<ResultCardData, 'id' | 'title' | 'subtitle' | 'href' | 'imagePath'>>
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

export const TitleConnectionSpotlight = ({ leftTitle, rightTitle, actors }: TitleConnectionSpotlightProps) => {
  if (!actors.length) {
    return null
  }

  return (
    <section className="title-spotlight" aria-label={`Top-billed shared cast for ${leftTitle.title} and ${rightTitle.title}`}>
      <div className="title-spotlight-header">
        <p className="title-spotlight-pairing">
          {leftTitle.title} + {rightTitle.title}
        </p>
      </div>

      <div className="title-spotlight-stage">
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

        <div className="title-spotlight-filmstrip">
          <div className="title-spotlight-filmstrip-label">Top-Billed Shared Cast</div>
          <svg viewBox="0 0 100 30" className="title-spotlight-reel" aria-hidden="true" preserveAspectRatio="none">
            <rect className="title-spotlight-reel-shadow" x="2" y="11.1" width="96" height="13.8" rx="3.4" />
            <rect className="title-spotlight-reel-body" x="2" y="12" width="96" height="12" rx="3" />
            <rect className="title-spotlight-reel-sheen" x="2" y="12.4" width="96" height="3.4" rx="2" />
            <line className="title-spotlight-reel-edge" x1="3.5" y1="12.7" x2="96.5" y2="12.7" />
            <line className="title-spotlight-reel-edge" x1="3.5" y1="23.3" x2="96.5" y2="23.3" />
            <line className="title-spotlight-reel-lane" x1="4.5" y1="18" x2="95.5" y2="18" />
            <g className="title-spotlight-reel-frames">
              <line x1="18.25" y1="13.35" x2="18.25" y2="22.65" />
              <line x1="34.75" y1="13.35" x2="34.75" y2="22.65" />
              <line x1="50" y1="13.35" x2="50" y2="22.65" />
              <line x1="65.25" y1="13.35" x2="65.25" y2="22.65" />
              <line x1="81.75" y1="13.35" x2="81.75" y2="22.65" />
            </g>
            <g className="title-spotlight-reel-holes">
              <rect x="6.8" y="13.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="17.7" y="13.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="28.6" y="13.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="39.5" y="13.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="50.4" y="13.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="61.3" y="13.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="72.2" y="13.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="83.1" y="13.7" width="5.2" height="1.6" rx="0.22" />

              <rect x="6.8" y="20.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="17.7" y="20.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="28.6" y="20.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="39.5" y="20.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="50.4" y="20.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="61.3" y="20.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="72.2" y="20.7" width="5.2" height="1.6" rx="0.22" />
              <rect x="83.1" y="20.7" width="5.2" height="1.6" rx="0.22" />
            </g>
          </svg>

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
      </div>
    </section>
  )
}
