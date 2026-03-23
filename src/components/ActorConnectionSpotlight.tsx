import type { ResultCardData } from './ResultCard'

const PROFILE_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w300'
const FILM_ROLL_IMAGE_URL = '/images/film-roll.png'

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
  hideSearchedActors?: boolean
}

const getProfileImageUrl = (path?: string | null): string | null => (path ? `${PROFILE_IMAGE_BASE_URL}${path}` : null)

const getInitials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?'

export const ActorConnectionSpotlight = ({
  leftActor,
  rightActor,
  titles,
  hideSearchedActors = false,
}: ActorConnectionSpotlightProps) => {
  if (!titles.length) {
    return null
  }

  return (
    <section className="actor-spotlight" aria-label={`Shared titles for ${leftActor.name} and ${rightActor.name}`}>
      <div className="actor-spotlight-filmstrip-label">Shared Films &amp; Shows</div>

      <div className="actor-spotlight-header">
        <p className="actor-spotlight-pairing">
          {leftActor.name} + {rightActor.name}
        </p>
      </div>

      <div className="actor-spotlight-stage">
        {!hideSearchedActors ? (
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
        ) : null}

        <div className="actor-spotlight-filmstrip">
          <img src={FILM_ROLL_IMAGE_URL} alt="" className="actor-spotlight-reel" aria-hidden="true" />

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

        {!hideSearchedActors ? (
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
        ) : null}
      </div>
    </section>
  )
}
