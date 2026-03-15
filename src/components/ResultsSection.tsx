import { ResultCard, type ResultCardData } from './ResultCard'

interface ResultsSectionProps {
  hasSearched: boolean
  isLoading: boolean
  resultCount: number
  cards: ResultCardData[]
  emptyDescription: string
  errorMessage: string | null
  showingHiddenExtras: boolean
}

const LOADING_PLACEHOLDERS = Array.from({ length: 6 }, (_, index) => `skeleton-${index}`)

export const ResultsSection = ({
  hasSearched,
  isLoading,
  resultCount,
  cards,
  emptyDescription,
  errorMessage,
  showingHiddenExtras,
}: ResultsSectionProps) => {
  if (!hasSearched) {
    return null
  }

  return (
    <section className="results-section" aria-live="polite">
      <div className="results-header">
        <h2>
          Results <span>({resultCount})</span>
        </h2>
        {showingHiddenExtras ? (
          <div className="results-banner" role="status">
            Showing hidden Talk Shows/Cameos due to 0 direct matches.
          </div>
        ) : null}
      </div>

      {errorMessage ? <div className="results-error">{errorMessage}</div> : null}

      {errorMessage && !isLoading ? null : isLoading ? (
        <div className="results-grid" aria-hidden="true">
          {LOADING_PLACEHOLDERS.map((placeholder) => (
            <div key={placeholder} className="result-skeleton">
              <div className="result-skeleton-image" />
              <div className="result-skeleton-line result-skeleton-line-primary" />
              <div className="result-skeleton-line result-skeleton-line-secondary" />
            </div>
          ))}
        </div>
      ) : cards.length ? (
        <div className="results-grid">
          {cards.map((card) => (
            <ResultCard key={card.id} card={card} />
          ))}
        </div>
      ) : (
        <div className="results-empty">
          <svg viewBox="0 0 24 24" fill="none" className="results-empty-icon" aria-hidden="true">
            <path
              d="M9.2 16.2a4 4 0 015.6 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <h3>No matches found</h3>
          <p>{emptyDescription}</p>
        </div>
      )}
    </section>
  )
}
