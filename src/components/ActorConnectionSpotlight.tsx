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

  const reelRibbonPath =
    'M2 12.7C15.5 10.15 29.3 10.25 42.8 13.6C48.6 15.05 51.4 15.05 57.2 13.6C70.7 10.25 84.5 10.15 98 12.7L98 23.3C84.5 20.75 70.7 20.85 57.2 24.2C51.4 25.65 48.6 25.65 42.8 24.2C29.3 20.85 15.5 20.75 2 23.3Z'
  const reelTopEdgePath = 'M2 12.7C15.5 10.15 29.3 10.25 42.8 13.6C48.6 15.05 51.4 15.05 57.2 13.6C70.7 10.25 84.5 10.15 98 12.7'
  const reelBottomEdgePath = 'M2 23.3C15.5 20.75 29.3 20.85 42.8 24.2C48.6 25.65 51.4 25.65 57.2 24.2C70.7 20.85 84.5 20.75 98 23.3'
  const reelLanePath = 'M4 18C17 15.7 30.3 15.8 43.3 18.6C48.7 19.75 51.3 19.75 56.7 18.6C69.7 15.8 83 15.7 96 18'

  return (
    <section className="actor-spotlight" aria-label={`Shared titles for ${leftActor.name} and ${rightActor.name}`}>
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
            <path className="actor-spotlight-reel-shadow" d={reelRibbonPath} />
            <path className="actor-spotlight-reel-body" d={reelRibbonPath} />
            <path className="actor-spotlight-reel-sheen" d="M2 13.55C15.5 11.55 29.3 11.7 42.8 14.35C48.6 15.5 51.4 15.5 57.2 14.35C70.7 11.7 84.5 11.55 98 13.55L98 15.9C84.5 13.9 70.7 14.05 57.2 16.7C51.4 17.85 48.6 17.85 42.8 16.7C29.3 14.05 15.5 13.9 2 15.9Z" />
            <path className="actor-spotlight-reel-edge" d={reelTopEdgePath} />
            <path className="actor-spotlight-reel-edge" d={reelBottomEdgePath} />
            <path className="actor-spotlight-reel-lane" d={reelLanePath} />
            <g className="actor-spotlight-reel-frames">
              <line x1="17.5" y1="13.7" x2="17.5" y2="22.2" />
              <line x1="34" y1="14" x2="34" y2="22.5" />
              <line x1="50" y1="14.35" x2="50" y2="22.85" />
              <line x1="66" y1="14" x2="66" y2="22.5" />
              <line x1="82.5" y1="13.7" x2="82.5" y2="22.2" />
            </g>
            <g className="actor-spotlight-reel-holes">
              <rect x="7" y="13.75" width="5.1" height="1.55" rx="0.24" />
              <rect x="17.9" y="13.45" width="5.1" height="1.55" rx="0.24" />
              <rect x="28.8" y="13.35" width="5.1" height="1.55" rx="0.24" />
              <rect x="39.7" y="14.1" width="5.1" height="1.55" rx="0.24" />
              <rect x="50.55" y="14.45" width="5.1" height="1.55" rx="0.24" />
              <rect x="61.4" y="14.1" width="5.1" height="1.55" rx="0.24" />
              <rect x="72.25" y="13.4" width="5.1" height="1.55" rx="0.24" />
              <rect x="83.1" y="13.65" width="5.1" height="1.55" rx="0.24" />

              <rect x="7" y="20.65" width="5.1" height="1.55" rx="0.24" />
              <rect x="17.9" y="20.95" width="5.1" height="1.55" rx="0.24" />
              <rect x="28.8" y="21.05" width="5.1" height="1.55" rx="0.24" />
              <rect x="39.7" y="20.3" width="5.1" height="1.55" rx="0.24" />
              <rect x="50.55" y="19.95" width="5.1" height="1.55" rx="0.24" />
              <rect x="61.4" y="20.3" width="5.1" height="1.55" rx="0.24" />
              <rect x="72.25" y="21.02" width="5.1" height="1.55" rx="0.24" />
              <rect x="83.1" y="20.75" width="5.1" height="1.55" rx="0.24" />
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
