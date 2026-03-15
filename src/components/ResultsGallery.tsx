const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342'

export type ResultCardVisual = 'person' | 'movie' | 'tv' | 'featured'

export interface ResultGalleryCard {
  id: string
  title: string
  subtitle: string
  detail?: string
  imagePath?: string | null
  visual: ResultCardVisual
}

interface ResultsGalleryProps {
  heading: string
  context: string
  cards: ResultGalleryCard[]
  emptyMessage: string
}

const getImageUrl = (path?: string | null): string | null => (path ? `${TMDB_IMAGE_BASE_URL}${path}` : null)

const getFallbackMonogram = (title: string): string =>
  title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?'

export const ResultsGallery = ({ heading, context, cards, emptyMessage }: ResultsGalleryProps) => {
  return (
    <section className="results panel panel-results" aria-live="polite">
      <div className="results-gallery-header">
        <h2>{heading}</h2>
        <p>{context}</p>
      </div>

      {cards.length ? (
        <div className="results-gallery-strip" role="list" aria-label="Search results">
          {cards.map((card) => {
            const imageUrl = getImageUrl(card.imagePath)
            return (
              <article key={card.id} className={`result-card result-card-${card.visual}`} role="listitem">
                <div className="result-card-poster">
                  {imageUrl ? (
                    <img src={imageUrl} alt="" />
                  ) : (
                    <div className="result-card-fallback" aria-hidden="true">
                      {getFallbackMonogram(card.title)}
                    </div>
                  )}
                </div>
                <div className="result-card-copy">
                  <h3>{card.title}</h3>
                  <p className="result-card-subtitle">{card.subtitle}</p>
                  {card.detail ? <p className="result-card-detail">{card.detail}</p> : null}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="status status-empty">{emptyMessage}</p>
      )}
    </section>
  )
}
