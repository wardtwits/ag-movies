import { ResultCard, type ResultCardData } from './ResultCard'

export interface ResultCardGroup {
  id: string
  title?: string
  cards: ResultCardData[]
}

interface ResultsSectionProps {
  hasSearched: boolean
  isLoading: boolean
  resultCount: number
  groups: ResultCardGroup[]
  emptyDescription: string
  errorMessage: string | null
  showingHiddenExtras: boolean
}

const LOADING_PLACEHOLDERS = Array.from({ length: 6 }, (_, index) => `skeleton-${index}`)

export const ResultsSection = ({
  hasSearched,
  isLoading,
  resultCount,
  groups,
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
            0 direct matches. Showing Talk Shows/Cameo matches.
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
      ) : groups.some((group) => group.cards.length > 0) ? (
        <div className="results-groups">
          {groups.filter((group) => group.cards.length > 0).map((group, index) => (
            <section key={group.id} className="results-group">
              {group.title ? (
                <div className={`results-group-divider${index > 0 ? ' results-group-divider-separated' : ''}`}>
                  <span>{group.title}</span>
                </div>
              ) : null}

              <div className="results-grid">
                {group.cards.map((card) => (
                  <ResultCard key={card.id} card={card} />
                ))}
              </div>
            </section>
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
