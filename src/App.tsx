import { useMemo, useState } from 'react'
import { CommonCastForm } from './components/CommonCastForm'
import { CommonCastGraph } from './components/CommonCastGraph'
import { findCommonCast } from './features/common-cast/commonCastService'
import { buildCommonCastGraph } from './features/common-cast/graphModel'
import { findCommonTitles } from './features/common-titles/commonTitlesService'
import { buildCommonTitlesGraph } from './features/common-titles/graphModel'
import type { CommonCastResult, SharedActorRoleCategory } from './features/common-cast/types'
import type { CommonTitlesResult } from './features/common-titles/types'
import './App.css'

type SearchMode = 'tv-film' | 'actor'

const ROLE_LEGEND_ITEMS: Array<{
  category: SharedActorRoleCategory
  label: string
  dotClassName: string
}> = [
  { category: 'star-both', label: 'Star on both', dotClassName: 'legend-star-both' },
  { category: 'mixed', label: 'Star on one only', dotClassName: 'legend-mixed' },
  { category: 'extra-both', label: 'Extra/supporting on both', dotClassName: 'legend-extra-both' },
]

const DEFAULT_ROLE_VISIBILITY: Record<SharedActorRoleCategory, boolean> = {
  'star-both': true,
  mixed: true,
  'extra-both': true,
}

const EMPTY_GRAPH = { nodes: [], links: [] }

function App() {
  const [searchMode, setSearchMode] = useState<SearchMode>('tv-film')
  const [leftTitle, setLeftTitle] = useState('')
  const [rightTitle, setRightTitle] = useState('')
  const [nodeSpacing, setNodeSpacing] = useState(1.5)
  const [roleVisibility, setRoleVisibility] = useState<Record<SharedActorRoleCategory, boolean>>({
    ...DEFAULT_ROLE_VISIBILITY,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [commonCastResult, setCommonCastResult] = useState<CommonCastResult | null>(null)
  const [commonTitlesResult, setCommonTitlesResult] = useState<CommonTitlesResult | null>(null)

  const filteredCastResult = useMemo(() => {
    if (!commonCastResult) {
      return null
    }

    return {
      ...commonCastResult,
      sharedActors: commonCastResult.sharedActors.filter((actor) => roleVisibility[actor.roleCategory]),
    }
  }, [commonCastResult, roleVisibility])

  const castGraphData = useMemo(
    () => (filteredCastResult ? buildCommonCastGraph(filteredCastResult) : EMPTY_GRAPH),
    [filteredCastResult],
  )

  const titlesGraphData = useMemo(
    () => (commonTitlesResult ? buildCommonTitlesGraph(commonTitlesResult) : EMPTY_GRAPH),
    [commonTitlesResult],
  )

  const activeGraphData = searchMode === 'tv-film' ? castGraphData : titlesGraphData

  const toggleRoleCategory = (category: SharedActorRoleCategory) => {
    setRoleVisibility((previous) => ({
      ...previous,
      [category]: !previous[category],
    }))
  }

  const handleSearchModeChange = (mode: SearchMode) => {
    if (mode === searchMode) {
      return
    }

    setSearchMode(mode)
    setErrorMessage(null)
    setCommonCastResult(null)
    setCommonTitlesResult(null)
    setRoleVisibility({ ...DEFAULT_ROLE_VISIBILITY })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (searchMode === 'tv-film') {
        const result = await findCommonCast(leftTitle, rightTitle)
        setCommonCastResult(result)
        setCommonTitlesResult(null)
      } else {
        const result = await findCommonTitles(leftTitle, rightTitle)
        setCommonTitlesResult(result)
        setCommonCastResult(null)
      }
    } catch (error) {
      setCommonCastResult(null)
      setCommonTitlesResult(null)
      const message = error instanceof Error ? error.message : 'Something went wrong while fetching TMDB data.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const activeResultExists = searchMode === 'tv-film' ? commonCastResult !== null : commonTitlesResult !== null

  const rawSharedCount = searchMode === 'tv-film' ? (commonCastResult?.sharedActors.length ?? 0) : (commonTitlesResult?.sharedTitles.length ?? 0)

  const shownSharedCount =
    searchMode === 'tv-film' ? (filteredCastResult?.sharedActors.length ?? 0) : (commonTitlesResult?.sharedTitles.length ?? 0)

  const leftSummaryLabel =
    searchMode === 'tv-film' ? commonCastResult?.left.media.title : commonTitlesResult?.left.person.name

  const rightSummaryLabel =
    searchMode === 'tv-film' ? commonCastResult?.right.media.title : commonTitlesResult?.right.person.name

  const chipLabels =
    searchMode === 'tv-film'
      ? (filteredCastResult?.sharedActors ?? []).map((actor) => actor.name)
      : (commonTitlesResult?.sharedTitles ?? []).map((title) => title.title)

  const isCastModeFilterEmpty = searchMode === 'tv-film' && rawSharedCount > 0 && shownSharedCount === 0

  const formContent =
    searchMode === 'tv-film'
      ? {
          leftLabel: 'Movie / TV title 1',
          rightLabel: 'Movie / TV title 2',
          leftPlaceholder: 'Example: The Matrix',
          rightPlaceholder: 'Example: John Wick',
          submitLabel: 'Build Common-Cast Graph',
          submitLoadingLabel: 'Matching Cast...',
        }
      : {
          leftLabel: 'Actor 1',
          rightLabel: 'Actor 2',
          leftPlaceholder: 'Example: Kelsey Grammer',
          rightPlaceholder: 'Example: Peri Gilpin',
          submitLabel: 'Build Common-Titles Graph',
          submitLoadingLabel: 'Matching Titles...',
        }

  const loadingMessage =
    searchMode === 'tv-film' ? 'Resolving titles and matching casts...' : 'Resolving actors and matching titles...'

  return (
    <div className="app-shell">
      <div className="ambient-glow ambient-left" />
      <div className="ambient-glow ambient-right" />
      <main className="app-main">
        <header className="hero">
          <p className="eyebrow">TMDB Cast Explorer</p>
          <h1>Find Shared Connections Between Two Inputs</h1>
          <p className="hero-copy">
            Compare two movies/TV titles to find shared actors, or compare two actors to find all TV/film titles they
            have in common.
          </p>
        </header>

        <section className="panel">
          <div className="search-mode" role="radiogroup" aria-label="Search mode">
            <span className="search-mode-text">Search by</span>
            <label className="search-mode-option">
              <span>Actor</span>
              <input
                type="radio"
                name="search-mode"
                value="actor"
                checked={searchMode === 'actor'}
                onChange={() => handleSearchModeChange('actor')}
              />
            </label>
            <label className="search-mode-option">
              <span>TV/Film</span>
              <input
                type="radio"
                name="search-mode"
                value="tv-film"
                checked={searchMode === 'tv-film'}
                onChange={() => handleSearchModeChange('tv-film')}
              />
            </label>
          </div>

          <CommonCastForm
            leftTitle={leftTitle}
            rightTitle={rightTitle}
            isLoading={isLoading}
            leftLabel={formContent.leftLabel}
            rightLabel={formContent.rightLabel}
            leftPlaceholder={formContent.leftPlaceholder}
            rightPlaceholder={formContent.rightPlaceholder}
            submitLabel={formContent.submitLabel}
            submitLoadingLabel={formContent.submitLoadingLabel}
            onLeftTitleChange={setLeftTitle}
            onRightTitleChange={setRightTitle}
            onSubmit={handleSubmit}
          />
        </section>

        {isLoading ? <p className="status status-loading">{loadingMessage}</p> : null}
        {errorMessage ? <p className="status status-error">{errorMessage}</p> : null}

        {activeResultExists ? (
          <section className="results">
            <div className="result-summary">
              <div className="title-pill left-pill">{leftSummaryLabel}</div>
              <div className="summary-meta">
                <span>
                  {shownSharedCount !== rawSharedCount
                    ? `${shownSharedCount} shown / ${rawSharedCount} shared`
                    : `${rawSharedCount} shared ${searchMode === 'tv-film' ? 'actor(s)' : 'title(s)'}`}
                </span>
              </div>
              <div className="title-pill right-pill">{rightSummaryLabel}</div>
            </div>

            {rawSharedCount > 0 ? (
              <>
                <div className="graph-controls">
                  <label className="graph-control-label" htmlFor="node-spacing">
                    Node spacing
                  </label>
                  <input
                    id="node-spacing"
                    className="graph-control-slider"
                    type="range"
                    min={0.8}
                    max={2.7}
                    step={0.1}
                    value={nodeSpacing}
                    onChange={(event) => setNodeSpacing(Number(event.target.value))}
                  />
                  <span className="graph-control-value">{nodeSpacing.toFixed(1)}x</span>
                </div>

                {searchMode === 'tv-film' ? (
                  <div className="graph-legend" aria-label="Actor node color legend">
                    {ROLE_LEGEND_ITEMS.map((item) => {
                      const isActive = roleVisibility[item.category]
                      return (
                        <button
                          key={item.category}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => toggleRoleCategory(item.category)}
                          className={`legend-item${isActive ? '' : ' legend-item-inactive'}`}
                        >
                          <span className={`legend-dot ${item.dotClassName}`} />
                          {item.label}
                        </button>
                      )
                    })}
                  </div>
                ) : null}

                <CommonCastGraph graphData={activeGraphData} nodeSpacing={nodeSpacing} />

                {isCastModeFilterEmpty ? (
                  <p className="status status-empty">All role categories are hidden. Toggle a legend pill back on.</p>
                ) : (
                  <div className="actor-list">
                    {chipLabels.slice(0, 18).map((label, index) => (
                      <span className="actor-chip" key={`${label}-${index}`}>
                        {label}
                      </span>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="status status-empty">
                {searchMode === 'tv-film'
                  ? 'No overlapping actors were found for this pair.'
                  : 'No overlapping TV/film titles were found for this pair.'}
              </p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default App
