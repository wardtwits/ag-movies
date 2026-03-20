import type { ResultCardData } from './ResultCard'

const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300'

interface SpotlightActor {
  name: string
  profilePath?: string | null
}

export interface ActorConnectionSpotlightTitle extends ResultCardData {
  metaLabel?: string
}

interface ActorConnectionSpotlightProps {
  leftActor: SpotlightActor
  rightActor: SpotlightActor
  titles: ActorConnectionSpotlightTitle[]
}

const getProfileImageUrl = (path?: string | null): string | null => (path ? `${PROFILE_IMAGE_BASE_URL}${path}` : null)

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'

export const ActorConnectionSpotlight = ({ leftActor, rightActor, titles }: ActorConnectionSpotlightProps) => {
  if (!titles.length) {
    return null
  }

  return (
    <section className="actor-spotlight" aria-label={`Featured shared titles for ${leftActor.name} and ${rightActor.name}`}>
      <div className="actor-spotlight-header">
        <p className="actor-spotlight-pairing">
          {leftActor.name} + {rightActor.name}
        </p>
      </div>

      <div className="actor-spotlight-stage">
        <div className="actor-spotlight-actor actor-spotlight-actor-left">
          <div className="actor-spotlight-portrait-shell">
            {getProfileImageUrl(leftActor.profilePath) ? (
              <img src={getProfileImageUrl(leftActor.profilePath) ?? undefined} alt="" className="actor-spotlight-portrait" />
            ) : (
              <span className="actor-spotlight-fallback" aria-hidden="true">
                {getInitials(leftActor.name)}
              </span>
            )}
          </div>
          <div className="actor-spotlight-nameplate">{leftActor.name}</div>
        </div>

        <div className="actor-spotlight-filmstrip">
          <div className="actor-spotlight-filmstrip-label">Shared Films &amp; Shows</div>
          <svg viewBox="0 0 100 30" className="actor-spotlight-reel" aria-hidden="true" preserveAspectRatio="none">
            <path
              className="actor-spotlight-reel-shadow"
              d="M2 16C13 7.5 24 7.5 35 16C46 24.5 54 24.5 65 16C76 7.5 87 7.5 98 16"
            />
            <path
              className="actor-spotlight-reel-body"
              d="M2 16C13 7.5 24 7.5 35 16C46 24.5 54 24.5 65 16C76 7.5 87 7.5 98 16"
            />
            <path
              className="actor-spotlight-reel-sheen"
              d="M2 16C13 7.5 24 7.5 35 16C46 24.5 54 24.5 65 16C76 7.5 87 7.5 98 16"
            />
            <path
              className="actor-spotlight-reel-edge"
              d="M2 11.7C13 3.2 24 3.2 35 11.7C46 20.2 54 20.2 65 11.7C76 3.2 87 3.2 98 11.7"
            />
            <path
              className="actor-spotlight-reel-edge"
              d="M2 20.3C13 11.8 24 11.8 35 20.3C46 28.8 54 28.8 65 20.3C76 11.8 87 11.8 98 20.3"
            />
            <g className="actor-spotlight-reel-holes">
              <rect x="9.5" y="7.1" width="2.6" height="1.2" rx="0.34" transform="rotate(-22 10.8 7.7)" />
              <rect x="19.3" y="4.9" width="2.6" height="1.2" rx="0.34" transform="rotate(-10 20.6 5.5)" />
              <rect x="29" y="5" width="2.6" height="1.2" rx="0.34" transform="rotate(7 30.3 5.6)" />
              <rect x="39.1" y="9.3" width="2.6" height="1.2" rx="0.34" transform="rotate(19 40.4 9.9)" />
              <rect x="48.7" y="12.1" width="2.6" height="1.2" rx="0.34" transform="rotate(0 50 12.7)" />
              <rect x="58.3" y="9.2" width="2.6" height="1.2" rx="0.34" transform="rotate(-18 59.6 9.8)" />
              <rect x="68.4" y="5" width="2.6" height="1.2" rx="0.34" transform="rotate(-7 69.7 5.6)" />
              <rect x="78.1" y="4.9" width="2.6" height="1.2" rx="0.34" transform="rotate(11 79.4 5.5)" />
              <rect x="87.9" y="7.2" width="2.6" height="1.2" rx="0.34" transform="rotate(21 89.2 7.8)" />

              <rect x="9.5" y="23.3" width="2.6" height="1.2" rx="0.34" transform="rotate(22 10.8 23.9)" />
              <rect x="19.3" y="25.5" width="2.6" height="1.2" rx="0.34" transform="rotate(10 20.6 26.1)" />
              <rect x="29" y="25.4" width="2.6" height="1.2" rx="0.34" transform="rotate(-7 30.3 26)" />
              <rect x="39.1" y="21.2" width="2.6" height="1.2" rx="0.34" transform="rotate(-19 40.4 21.8)" />
              <rect x="48.7" y="18.4" width="2.6" height="1.2" rx="0.34" transform="rotate(0 50 19)" />
              <rect x="58.3" y="21.3" width="2.6" height="1.2" rx="0.34" transform="rotate(18 59.6 21.9)" />
              <rect x="68.4" y="25.4" width="2.6" height="1.2" rx="0.34" transform="rotate(7 69.7 26)" />
              <rect x="78.1" y="25.5" width="2.6" height="1.2" rx="0.34" transform="rotate(-11 79.4 26.1)" />
              <rect x="87.9" y="23.3" width="2.6" height="1.2" rx="0.34" transform="rotate(-21 89.2 23.9)" />
            </g>
          </svg>

          <div className={`actor-spotlight-titles actor-spotlight-titles-count-${titles.length}`}>
            {titles.map((title, index) => (
              <a
                key={title.id}
                href={title.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`actor-spotlight-card actor-spotlight-card-${index + 1}`}
              >
                <span className="actor-spotlight-card-frame">
                  {title.imagePath ? (
                    <img src={`https://image.tmdb.org/t/p/w342${title.imagePath}`} alt="" className="actor-spotlight-card-image" />
                  ) : (
                    <span className="actor-spotlight-card-fallback" aria-hidden="true">
                      {title.title.charAt(0).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="actor-spotlight-card-copy">
                  {title.metaLabel ? <span className="actor-spotlight-card-tag">{title.metaLabel}</span> : null}
                  <span className="actor-spotlight-card-title">{title.title}</span>
                </span>
              </a>
            ))}
          </div>
        </div>

        <div className="actor-spotlight-actor actor-spotlight-actor-right">
          <div className="actor-spotlight-portrait-shell">
            {getProfileImageUrl(rightActor.profilePath) ? (
              <img src={getProfileImageUrl(rightActor.profilePath) ?? undefined} alt="" className="actor-spotlight-portrait" />
            ) : (
              <span className="actor-spotlight-fallback" aria-hidden="true">
                {getInitials(rightActor.name)}
              </span>
            )}
          </div>
          <div className="actor-spotlight-nameplate">{rightActor.name}</div>
        </div>
      </div>
    </section>
  )
}
