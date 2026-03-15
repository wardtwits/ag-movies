const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'

export interface ResultCardData {
  id: string
  title: string
  subtitle: string
  href: string
  imagePath?: string | null
}

interface ResultCardProps {
  card: ResultCardData
}

const getImageUrl = (path?: string | null): string | null => (path ? `${TMDB_IMAGE_BASE_URL}${path}` : null)

export const ResultCard = ({ card }: ResultCardProps) => {
  const imageUrl = getImageUrl(card.imagePath)

  return (
    <a href={card.href} target="_blank" rel="noopener noreferrer" className="result-card">
      <div className="result-card-image-shell">
        {imageUrl ? (
          <img src={imageUrl} alt="" loading="lazy" className="result-card-image" />
        ) : (
          <div className="result-card-fallback" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="result-card-fallback-icon">
              <path
                d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2 1.6-1.6a2 2 0 012.8 0L21 14.9V20a1 1 0 01-1 1H4a1 1 0 01-1-1v-4z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
      <div className="result-card-copy">
        <h3>{card.title}</h3>
        <p title={card.subtitle} aria-label={card.subtitle}>
          {card.subtitle}
        </p>
      </div>
    </a>
  )
}
