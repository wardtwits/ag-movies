import type { ReactNode } from 'react'
import { FilterToggle } from './FilterToggle'
import { LinkIcon } from './LinkIcon'
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
  spotlight?: ReactNode
  sectionClassName?: string
  emptyDescription: string
  errorMessage: string | null
  errorIllustrationSrc?: string
  showingHiddenExtras: boolean
  showFilterToggle: boolean
  filterChecked: boolean
  onFilterChange: (checked: boolean) => void
  showCopyResultsLink: boolean
  copyResultsLinkLabel: string
  onCopyResultsLink: () => void
  showBackToTopLink: boolean
  onBackToTop: () => void
}

const LOADING_PLACEHOLDERS = Array.from({ length: 6 }, (_, index) => `skeleton-${index}`)

export const ResultsSection = ({
  hasSearched,
  isLoading,
  resultCount,
  groups,
  spotlight,
  sectionClassName,
  emptyDescription,
  errorMessage,
  errorIllustrationSrc,
  showingHiddenExtras,
  showFilterToggle,
  filterChecked,
  onFilterChange,
  showCopyResultsLink,
  copyResultsLinkLabel,
  onCopyResultsLink,
  showBackToTopLink,
  onBackToTop,
}: ResultsSectionProps) => {
  if (!hasSearched) {
    return null
  }

  const hasRenderableGroups = groups.some((group) => group.cards.length > 0)
  const hasRenderableContent = Boolean(spotlight) || hasRenderableGroups

  return (
    <section className={`results-section${sectionClassName ? ` ${sectionClassName}` : ''}`} aria-live="polite">
      <div className="results-header">
        <div className="results-header-top">
          <div className="results-header-main">
            <h2>
              Results <span>({resultCount})</span>
            </h2>
            {showFilterToggle ? (
              <div className="results-filter-row">
                <FilterToggle checked={filterChecked} onChange={onFilterChange} />
              </div>
            ) : null}
          </div>
          {showCopyResultsLink ? (
            <button type="button" className="results-share-button" onClick={onCopyResultsLink}>
              <LinkIcon className="action-link-icon" />
              <span>{copyResultsLinkLabel}</span>
            </button>
          ) : null}
        </div>
        {showingHiddenExtras ? (
          <div className="results-banner" role="status">
            0 direct matches. Showing Talk Shows/Cameo matches.
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <div className={`results-error${errorIllustrationSrc ? ' search-error-with-illustration' : ''}`}>
          <p className="search-error-message">{errorMessage}</p>
          {errorIllustrationSrc ? (
            <img src={errorIllustrationSrc} alt="" aria-hidden="true" className="search-error-illustration" />
          ) : null}
        </div>
      ) : null}

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
      ) : hasRenderableContent ? (
        <div className="results-groups">
          {spotlight ? <div className="results-spotlight">{spotlight}</div> : null}
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

          {showBackToTopLink ? (
            <div className="results-footer">
              <button type="button" className="results-back-to-top-link" onClick={onBackToTop}>
                Back to Top
              </button>
            </div>
          ) : null}
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
