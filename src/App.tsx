import { useMemo, useState } from 'react'
import { resolveActor, resolveTitle } from './api/tmdbClient'
import { BaconPathGraph } from './components/BaconPathGraph'
import { CommonCastForm } from './components/CommonCastForm'
import { CommonCastGraph } from './components/CommonCastGraph'
import { findBaconConnectionFromPerson } from './features/bacon-law/baconLawService'
import type { BaconLawResult } from './features/bacon-law/types'
import type { MediaTitle, PersonSummary } from './domain/media'
import {
  AUTOCOMPLETE_MIN_QUERY_LENGTH,
  fetchMediaSuggestions,
  fetchPersonSuggestions,
  useAutocompleteSuggestions,
} from './features/autocomplete/useAutocompleteSuggestions'
import { findCommonCastFromMedia } from './features/common-cast/commonCastService'
import { buildCommonCastGraph } from './features/common-cast/graphModel'
import { findCommonTitlesFromPeople } from './features/common-titles/commonTitlesService'
import { buildCommonTitlesGraph } from './features/common-titles/graphModel'
import { findRandomCommonCastMatch, findRandomCommonTitlesMatch } from './features/random-match/randomMatchService'
import type { CommonCastResult, SharedActorRoleCategory } from './features/common-cast/types'
import type { CommonTitlesResult } from './features/common-titles/types'
import './App.css'

type SearchMode = 'tv-film' | 'actor' | 'bacon-law'

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
type SearchSelection = MediaTitle | PersonSummary

const isMediaSelection = (selection: SearchSelection | null): selection is MediaTitle =>
  selection !== null && 'mediaType' in selection

const isPersonSelection = (selection: SearchSelection | null): selection is PersonSummary =>
  selection !== null && !('mediaType' in selection)

const getSelectionLabel = (selection: SearchSelection): string => ('mediaType' in selection ? selection.title : selection.name)

function App() {
  const [searchMode, setSearchMode] = useState<SearchMode>('tv-film')
  const [leftTitle, setLeftTitle] = useState('')
  const [rightTitle, setRightTitle] = useState('')
  const [leftSelection, setLeftSelection] = useState<SearchSelection | null>(null)
  const [rightSelection, setRightSelection] = useState<SearchSelection | null>(null)
  const [nodeSpacing, setNodeSpacing] = useState(1.5)
  const [roleVisibility, setRoleVisibility] = useState<Record<SharedActorRoleCategory, boolean>>({
    ...DEFAULT_ROLE_VISIBILITY,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [commonCastResult, setCommonCastResult] = useState<CommonCastResult | null>(null)
  const [commonTitlesResult, setCommonTitlesResult] = useState<CommonTitlesResult | null>(null)
  const [baconLawResult, setBaconLawResult] = useState<BaconLawResult | null>(null)
  const leftMediaAutocomplete = useAutocompleteSuggestions(leftTitle, {
    enabled: searchMode === 'tv-film',
    loader: fetchMediaSuggestions,
  })
  const rightMediaAutocomplete = useAutocompleteSuggestions(rightTitle, {
    enabled: searchMode === 'tv-film',
    loader: fetchMediaSuggestions,
  })
  const leftPersonAutocomplete = useAutocompleteSuggestions(leftTitle, {
    enabled: searchMode !== 'tv-film',
    loader: fetchPersonSuggestions,
  })
  const rightPersonAutocomplete = useAutocompleteSuggestions(rightTitle, {
    enabled: searchMode === 'actor',
    loader: fetchPersonSuggestions,
  })

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
    setBaconLawResult(null)
    setLeftSelection(null)
    setRightSelection(null)
    setRoleVisibility({ ...DEFAULT_ROLE_VISIBILITY })
  }

  const handleLeftInputChange = (value: string) => {
    setLeftTitle(value)
    setErrorMessage(null)
    if (leftSelection && getSelectionLabel(leftSelection) !== value) {
      setLeftSelection(null)
    }
  }

  const handleRightInputChange = (value: string) => {
    setRightTitle(value)
    setErrorMessage(null)
    if (rightSelection && getSelectionLabel(rightSelection) !== value) {
      setRightSelection(null)
    }
  }

  const handleLeftSelection = (selection: SearchSelection) => {
    setLeftSelection(selection)
    setLeftTitle(getSelectionLabel(selection))
    setErrorMessage(null)
  }

  const handleRightSelection = (selection: SearchSelection) => {
    setRightSelection(selection)
    setRightTitle(getSelectionLabel(selection))
    setErrorMessage(null)
  }

  const clearLeftSelection = () => {
    setLeftSelection(null)
    setLeftTitle('')
    setErrorMessage(null)
  }

  const clearRightSelection = () => {
    setRightSelection(null)
    setRightTitle('')
    setErrorMessage(null)
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (searchMode === 'tv-film') {
        const [leftMedia, rightMedia] = await Promise.all([
          isMediaSelection(leftSelection) ? Promise.resolve(leftSelection) : resolveTitle(leftTitle),
          isMediaSelection(rightSelection) ? Promise.resolve(rightSelection) : resolveTitle(rightTitle),
        ])
        const result = await findCommonCastFromMedia(leftMedia, rightMedia)
        setLeftSelection(leftMedia)
        setRightSelection(rightMedia)
        setLeftTitle(leftMedia.title)
        setRightTitle(rightMedia.title)
        setCommonCastResult(result)
        setCommonTitlesResult(null)
        setBaconLawResult(null)
      } else if (searchMode === 'actor') {
        const [leftActor, rightActor] = await Promise.all([
          isPersonSelection(leftSelection) ? Promise.resolve(leftSelection) : resolveActor(leftTitle),
          isPersonSelection(rightSelection) ? Promise.resolve(rightSelection) : resolveActor(rightTitle),
        ])
        const result = await findCommonTitlesFromPeople(leftActor, rightActor)
        setLeftSelection(leftActor)
        setRightSelection(rightActor)
        setLeftTitle(leftActor.name)
        setRightTitle(rightActor.name)
        setCommonTitlesResult(result)
        setCommonCastResult(null)
        setBaconLawResult(null)
      } else {
        const actor = isPersonSelection(leftSelection) ? leftSelection : await resolveActor(leftTitle)
        const result = await findBaconConnectionFromPerson(actor)
        setLeftSelection(actor)
        setLeftTitle(actor.name)
        setBaconLawResult(result)
        setCommonCastResult(null)
        setCommonTitlesResult(null)
      }
    } catch (error) {
      setCommonCastResult(null)
      setCommonTitlesResult(null)
      setBaconLawResult(null)
      const message = error instanceof Error ? error.message : 'Something went wrong while fetching TMDB data.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRandomMatch = async () => {
    if (searchMode === 'bacon-law') {
      return
    }

    setIsLoading(true)
    setErrorMessage(null)
    setRoleVisibility({ ...DEFAULT_ROLE_VISIBILITY })

    try {
      if (searchMode === 'tv-film') {
        const { selection, result } = await findRandomCommonCastMatch()
        setLeftTitle(selection.left.title)
        setRightTitle(selection.right.title)
        setLeftSelection(selection.left)
        setRightSelection(selection.right)
        setCommonCastResult(result)
        setCommonTitlesResult(null)
        setBaconLawResult(null)
      } else {
        const { selection, result } = await findRandomCommonTitlesMatch()
        setLeftTitle(selection.left.name)
        setRightTitle(selection.right.name)
        setLeftSelection(selection.left)
        setRightSelection(selection.right)
        setCommonTitlesResult(result)
        setCommonCastResult(null)
        setBaconLawResult(null)
      }
    } catch (error) {
      setCommonCastResult(null)
      setCommonTitlesResult(null)
      setBaconLawResult(null)
      const message = error instanceof Error ? error.message : 'Something went wrong while generating a random match.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  const activeResultExists =
    searchMode === 'tv-film'
      ? commonCastResult !== null
      : searchMode === 'actor'
        ? commonTitlesResult !== null
        : baconLawResult !== null

  const rawSharedCount =
    searchMode === 'tv-film' ? (commonCastResult?.sharedActors.length ?? 0) : (commonTitlesResult?.sharedTitles.length ?? 0)

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
          submitLabel: 'Build Overlap Layout',
          submitLoadingLabel: 'Matching Cast...',
        }
      : {
          leftLabel: 'Actor 1',
          rightLabel: 'Actor 2',
          leftPlaceholder: 'Example: Kelsey Grammer',
          rightPlaceholder: 'Example: Peri Gilpin',
          submitLabel: 'Build Overlap Layout',
          submitLoadingLabel: 'Matching Titles...',
        }

  const activeFormContent =
    searchMode === 'bacon-law'
      ? {
          leftLabel: 'Actor',
          rightLabel: '',
          leftPlaceholder: 'Example: Carrie Fisher',
          rightPlaceholder: '',
          submitLabel: 'Find Degrees of Bacon',
          submitLoadingLabel: 'Finding Degrees of Bacon...',
          showRightInput: false,
        }
      : {
          ...formContent,
          showRightInput: true,
        }

  const loadingMessage =
    searchMode === 'tv-film'
      ? 'Resolving titles and matching casts...'
      : searchMode === 'actor'
        ? 'Resolving actors and matching titles...'
        : 'Searching for the shortest Kevin Bacon connection...'

  const leftAutocomplete =
    searchMode === 'tv-film'
      ? {
          suggestions: leftMediaAutocomplete.suggestions,
          selectedEntity: isMediaSelection(leftSelection) ? leftSelection : null,
          isLoading: leftMediaAutocomplete.isLoading,
          minimumQueryLength: AUTOCOMPLETE_MIN_QUERY_LENGTH,
          hasSearched: leftMediaAutocomplete.hasSearched,
          inputKind: 'media' as const,
          onSelect: handleLeftSelection,
          onClearSelection: clearLeftSelection,
        }
      : {
          suggestions: leftPersonAutocomplete.suggestions,
          selectedEntity: isPersonSelection(leftSelection) ? leftSelection : null,
          isLoading: leftPersonAutocomplete.isLoading,
          minimumQueryLength: AUTOCOMPLETE_MIN_QUERY_LENGTH,
          hasSearched: leftPersonAutocomplete.hasSearched,
          inputKind: 'person' as const,
          onSelect: handleLeftSelection,
          onClearSelection: clearLeftSelection,
        }

  const rightAutocomplete =
    searchMode === 'tv-film'
      ? {
          suggestions: rightMediaAutocomplete.suggestions,
          selectedEntity: isMediaSelection(rightSelection) ? rightSelection : null,
          isLoading: rightMediaAutocomplete.isLoading,
          minimumQueryLength: AUTOCOMPLETE_MIN_QUERY_LENGTH,
          hasSearched: rightMediaAutocomplete.hasSearched,
          inputKind: 'media' as const,
          onSelect: handleRightSelection,
          onClearSelection: clearRightSelection,
        }
      : searchMode === 'actor'
        ? {
            suggestions: rightPersonAutocomplete.suggestions,
            selectedEntity: isPersonSelection(rightSelection) ? rightSelection : null,
            isLoading: rightPersonAutocomplete.isLoading,
            minimumQueryLength: AUTOCOMPLETE_MIN_QUERY_LENGTH,
            hasSearched: rightPersonAutocomplete.hasSearched,
            inputKind: 'person' as const,
            onSelect: handleRightSelection,
            onClearSelection: clearRightSelection,
          }
        : undefined

  return (
    <div className={`app-shell app-shell-${searchMode}`}>
      <div className="ambient-glow ambient-left" />
      <div className="ambient-glow ambient-right" />
      <main className="app-main">
        <header className="hero">
          <h1>
            Cast<span className="hero-accent">Link</span>
          </h1>
          <p className="hero-copy">
            Uncover every shared cinematic moment between your favorite stars. Compare titles, compare actors, or trace
            a Bacon number back to Kevin Bacon.
          </p>
        </header>

        <section className="panel">
          <div className="search-mode" role="radiogroup" aria-label="Search mode">
            <span className="search-mode-text">Search by</span>
            <label className={`search-mode-option${searchMode === 'actor' ? ' search-mode-option-active' : ''}`}>
              <span>Actor</span>
              <input
                type="radio"
                name="search-mode"
                value="actor"
                checked={searchMode === 'actor'}
                onChange={() => handleSearchModeChange('actor')}
              />
            </label>
            <label className={`search-mode-option${searchMode === 'tv-film' ? ' search-mode-option-active' : ''}`}>
              <span>TV/Film</span>
              <input
                type="radio"
                name="search-mode"
                value="tv-film"
                checked={searchMode === 'tv-film'}
                onChange={() => handleSearchModeChange('tv-film')}
              />
            </label>
            <label className={`search-mode-option${searchMode === 'bacon-law' ? ' search-mode-option-active' : ''}`}>
              <span>Bacon&apos;s Law</span>
              <input
                type="radio"
                name="search-mode"
                value="bacon-law"
                checked={searchMode === 'bacon-law'}
                onChange={() => handleSearchModeChange('bacon-law')}
              />
            </label>
          </div>
          <p className="panel-note">
            {searchMode === 'tv-film'
              ? 'Compare two movies or series and surface every shared cast connection.'
              : searchMode === 'actor'
                ? 'Enter two actors to reveal every title they have both appeared in.'
                : 'Enter one actor and trace the shortest client-side path back to Kevin Bacon.'}
          </p>

          <CommonCastForm
            leftTitle={leftTitle}
            rightTitle={rightTitle}
            isLoading={isLoading}
            leftLabel={activeFormContent.leftLabel}
            rightLabel={activeFormContent.rightLabel}
            leftPlaceholder={activeFormContent.leftPlaceholder}
            rightPlaceholder={activeFormContent.rightPlaceholder}
            submitLabel={activeFormContent.submitLabel}
            submitLoadingLabel={activeFormContent.submitLoadingLabel}
            secondaryActionLabel={searchMode === 'bacon-law' ? undefined : 'Random Match'}
            leftAutocomplete={leftAutocomplete}
            rightAutocomplete={rightAutocomplete}
            onLeftTitleChange={handleLeftInputChange}
            onRightTitleChange={handleRightInputChange}
            onSubmit={handleSubmit}
            onSecondaryAction={searchMode === 'bacon-law' ? undefined : handleRandomMatch}
            showRightInput={activeFormContent.showRightInput}
          />
        </section>

        {isLoading ? <p className="status status-loading">{loadingMessage}</p> : null}
        {errorMessage ? <p className="status status-error">{errorMessage}</p> : null}

        {activeResultExists ? (
          searchMode === 'bacon-law' && baconLawResult ? (
            <section className="results panel panel-results">
              <div className="results-headline">
                <p className="results-kicker">Degrees of Bacon</p>
                <h2>Connection path found</h2>
              </div>
              <div className="result-summary">
                <div className="title-pill left-pill">{baconLawResult.actor.person.name}</div>
                <div className="summary-meta">
                  <span>{`Bacon number ${baconLawResult.degree}`}</span>
                </div>
                <div className="title-pill right-pill">{baconLawResult.kevinBacon.person.name}</div>
              </div>

              <BaconPathGraph result={baconLawResult} />
            </section>
          ) : (
          <section className="results panel panel-results">
            <div className="results-headline">
              <p className="results-kicker">{searchMode === 'tv-film' ? 'Shared cast' : 'Shared credits'}</p>
              <h2>{searchMode === 'tv-film' ? 'Overlap map' : 'Common filmography'}</h2>
            </div>
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
                    Magnetic spread
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
          )
        ) : null}
      </main>
    </div>
  )
}

export default App
