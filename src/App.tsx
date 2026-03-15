import { useEffect, useMemo, useRef, useState } from 'react'
import { AboutDialog } from './components/AboutDialog'
import { AppNav } from './components/AppNav'
import { BaconPathSection } from './components/BaconPathSection'
import { FilterToggle } from './components/FilterToggle'
import { HeroHeader, type SearchMode } from './components/HeroHeader'
import { HowItWorksDialog } from './components/HowItWorksDialog'
import { ResultsSection, type ResultCardGroup } from './components/ResultsSection'
import { SearchAutocompleteField } from './components/SearchAutocompleteField'
import { TmdbFooter } from './components/TmdbFooter'
import { isStarBillingOrder } from './domain/billing'
import type { MediaTitle, PersonSummary } from './domain/media'
import {
  AUTOCOMPLETE_MIN_QUERY_LENGTH,
  fetchMediaSuggestions,
  fetchPersonSuggestions,
  useAutocompleteSuggestions,
} from './features/autocomplete/useAutocompleteSuggestions'
import { findBaconConnectionFromPerson } from './features/bacon-law/baconLawService'
import type { BaconLawResult } from './features/bacon-law/types'
import {
  filterCommonCastResult,
  findCommonCastFromMedia,
} from './features/common-cast/commonCastService'
import type { CommonCastResult, SharedActor } from './features/common-cast/types'
import {
  filterCommonTitlesResult,
  findCommonTitlesFromPeople,
} from './features/common-titles/commonTitlesService'
import type { CommonTitlesResult, SharedTitle } from './features/common-titles/types'
import {
  findRandomBaconActor,
  findRandomCommonCastMatch,
  findRandomCommonTitlesMatch,
} from './features/random-match/randomMatchService'
import './App.css'

type SearchSelection = MediaTitle | PersonSummary

type ComparisonSearchState =
  | { kind: 'actors'; result: CommonTitlesResult }
  | { kind: 'titles'; result: CommonCastResult }

const isMediaSelection = (selection: SearchSelection | null): selection is MediaTitle =>
  selection !== null && 'mediaType' in selection

const isPersonSelection = (selection: SearchSelection | null): selection is PersonSummary =>
  selection !== null && !('mediaType' in selection)

const getSelectionLabel = (selection: SearchSelection): string => ('mediaType' in selection ? selection.title : selection.name)

const getSelectionIdentity = (selection: SearchSelection): string =>
  'mediaType' in selection ? `media:${selection.mediaType}:${selection.id}` : `person:${selection.id}`

const getDuplicateSelectionMessage = (
  mode: SearchMode,
  primarySelection: SearchSelection | null,
  secondarySelection: SearchSelection | null,
): string | null => {
  if (mode === 'bacon' || !primarySelection || !secondarySelection) {
    return null
  }

  if (getSelectionIdentity(primarySelection) !== getSelectionIdentity(secondarySelection)) {
    return null
  }

  return mode === 'actors'
    ? 'Choose two different actors before searching.'
    : 'Choose two different movies or shows before searching.'
}

const getActiveSearchKey = (
  mode: SearchMode,
  primarySelection: SearchSelection | null,
  secondarySelection: SearchSelection | null,
): string | null => {
  if (mode === 'actors' && isPersonSelection(primarySelection) && isPersonSelection(secondarySelection)) {
    return `actors:${primarySelection.id}:${secondarySelection.id}`
  }

  if (mode === 'titles' && isMediaSelection(primarySelection) && isMediaSelection(secondarySelection)) {
    return `titles:${primarySelection.id}:${secondarySelection.id}`
  }

  if (mode === 'bacon' && isPersonSelection(primarySelection)) {
    return `bacon:${primarySelection.id}`
  }

  return null
}

const getComparisonResultCount = (state: ComparisonSearchState | null): number => {
  if (!state) {
    return 0
  }

  return state.kind === 'actors' ? state.result.sharedTitles.length : state.result.sharedActors.length
}

const tmdbPersonHref = (id: number): string => `https://www.themoviedb.org/person/${id}`
const tmdbMediaHref = (mediaType: 'movie' | 'tv', id: number): string =>
  `https://www.themoviedb.org/${mediaType === 'tv' ? 'tv' : 'movie'}/${id}`

const joinCharacterSummary = (...characters: Array<string | undefined>): string | null => {
  const values = characters.filter(Boolean) as string[]
  if (!values.length) {
    return null
  }
  return values.join(' / ')
}

const formatMediaMeta = (mediaType: 'movie' | 'tv', releaseDate?: string): string => {
  const typeLabel = mediaType === 'tv' ? 'TV Show' : 'Movie'
  const year = releaseDate?.slice(0, 4)
  return year ? `${typeLabel} • ${year}` : typeLabel
}

const mapSharedTitleToCard = (title: SharedTitle) => ({
  id: `${title.mediaType}-${title.id}`,
  title: title.title,
  subtitle: joinCharacterSummary(title.leftCharacter, title.rightCharacter)
    ? `As ${joinCharacterSummary(title.leftCharacter, title.rightCharacter)}`
    : formatMediaMeta(title.mediaType, title.releaseDate),
  href: tmdbMediaHref(title.mediaType, title.id),
  imagePath: title.posterPath,
})

const getSharedTitleKey = (title: SharedTitle): string => `${title.mediaType}-${title.id}`

const compareTitlesByPopularity = (left: SharedTitle, right: SharedTitle): number => {
  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity
  }

  if (right.voteCount !== left.voteCount) {
    return right.voteCount - left.voteCount
  }

  return left.title.localeCompare(right.title)
}

const compareTitlesByEarliestRelease = (left: SharedTitle, right: SharedTitle): number => {
  if (left.releaseDate && right.releaseDate && left.releaseDate !== right.releaseDate) {
    return left.releaseDate.localeCompare(right.releaseDate)
  }

  if (left.releaseDate && !right.releaseDate) {
    return -1
  }

  if (!left.releaseDate && right.releaseDate) {
    return 1
  }

  return compareTitlesByPopularity(left, right)
}

const compareTitlesByMostRecentRelease = (left: SharedTitle, right: SharedTitle): number => {
  if (left.releaseDate && right.releaseDate && left.releaseDate !== right.releaseDate) {
    return right.releaseDate.localeCompare(left.releaseDate)
  }

  if (left.releaseDate && !right.releaseDate) {
    return -1
  }

  if (!left.releaseDate && right.releaseDate) {
    return 1
  }

  return compareTitlesByPopularity(left, right)
}

const pickHighlightedActorTitles = (
  titles: SharedTitle[],
): Array<{ title: SharedTitle; metaLabel: 'Most Popular' | 'Earliest' | 'Most Recent' }> => {
  const highlighted: Array<{ title: SharedTitle; metaLabel: 'Most Popular' | 'Earliest' | 'Most Recent' }> = []
  const usedKeys = new Set<string>()

  const pickNext = (
    candidates: SharedTitle[],
    metaLabel: 'Most Popular' | 'Earliest' | 'Most Recent',
    compare: (left: SharedTitle, right: SharedTitle) => number,
  ) => {
    const nextTitle = [...candidates].filter((title) => !usedKeys.has(getSharedTitleKey(title))).sort(compare)[0]
    if (!nextTitle) {
      return
    }

    usedKeys.add(getSharedTitleKey(nextTitle))
    highlighted.push({ title: nextTitle, metaLabel })
  }

  pickNext(titles, 'Most Popular', compareTitlesByPopularity)
  pickNext(
    titles.filter((title) => Boolean(title.releaseDate)),
    'Earliest',
    compareTitlesByEarliestRelease,
  )
  pickNext(
    titles.filter((title) => Boolean(title.releaseDate)),
    'Most Recent',
    compareTitlesByMostRecentRelease,
  )

  return highlighted
}

const mapSharedActorToCard = (actor: SharedActor) => ({
  id: `person-${actor.id}`,
  title: actor.name,
  subtitle: joinCharacterSummary(actor.leftCharacter, actor.rightCharacter)
    ? `Role: ${joinCharacterSummary(actor.leftCharacter, actor.rightCharacter)}`
    : 'Actor',
  href: tmdbPersonHref(actor.id),
  imagePath: actor.profilePath,
})

const getBestBillingOrder = (actor: SharedActor): number => Math.min(actor.leftOrder, actor.rightOrder)

const compareExtraActorsForTitles = (left: SharedActor, right: SharedActor): number => {
  const billingDelta = getBestBillingOrder(left) - getBestBillingOrder(right)
  if (billingDelta !== 0) {
    return billingDelta
  }

  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity
  }

  return left.name.localeCompare(right.name)
}

const buildResultGroups = (featuredCards: ReturnType<typeof mapSharedActorToCard>[], extraCards: ReturnType<typeof mapSharedActorToCard>[]): ResultCardGroup[] => {
  const groups: ResultCardGroup[] = []

  if (featuredCards.length) {
    groups.push({
      id: 'featured',
      title: 'Stars / Featured',
      cards: featuredCards,
    })
  }

  if (extraCards.length) {
    groups.push({
      id: 'extras',
      title: 'Extras or Guests',
      cards: extraCards,
    })
  }

  return groups
}

const PRIMARY_PLACEHOLDERS: Record<SearchMode, string> = {
  actors: 'Search first actor...',
  titles: 'Search first movie or show...',
  bacon: 'Type in an actor, or...',
}

const SECONDARY_PLACEHOLDERS: Record<Exclude<SearchMode, 'bacon'>, string> = {
  actors: 'Search second actor...',
  titles: 'Search second movie or show...',
}

const SHOW_RANDOM_MATCH = false

function App() {
  const [mode, setMode] = useState<SearchMode>('actors')
  const [primaryQuery, setPrimaryQuery] = useState('')
  const [secondaryQuery, setSecondaryQuery] = useState('')
  const [primarySelection, setPrimarySelection] = useState<SearchSelection | null>(null)
  const [secondarySelection, setSecondarySelection] = useState<SearchSelection | null>(null)
  const [filterExtras, setFilterExtras] = useState(true)
  const [showingHiddenExtras, setShowingHiddenExtras] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isPickingRandomBaconActor, setIsPickingRandomBaconActor] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [comparisonState, setComparisonState] = useState<ComparisonSearchState | null>(null)
  const [baconResult, setBaconResult] = useState<BaconLawResult | null>(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const searchRequestIdRef = useRef(0)
  const lastCompletedSearchKeyRef = useRef<string | null>(null)

  const primaryMediaAutocomplete = useAutocompleteSuggestions(primaryQuery, {
    enabled: mode === 'titles',
    loader: fetchMediaSuggestions,
  })
  const secondaryMediaAutocomplete = useAutocompleteSuggestions(secondaryQuery, {
    enabled: mode === 'titles',
    loader: fetchMediaSuggestions,
  })
  const primaryPersonAutocomplete = useAutocompleteSuggestions(primaryQuery, {
    enabled: mode !== 'titles',
    loader: fetchPersonSuggestions,
  })
  const secondaryPersonAutocomplete = useAutocompleteSuggestions(secondaryQuery, {
    enabled: mode === 'actors',
    loader: fetchPersonSuggestions,
  })

  const activeSearchKey = useMemo(
    () => getActiveSearchKey(mode, primarySelection, secondarySelection),
    [mode, primarySelection, secondarySelection],
  )

  const isFilteringVisibleOnly = filterExtras && !showingHiddenExtras
  const canClearSearchFields =
    Boolean(primaryQuery.trim()) ||
    Boolean(secondaryQuery.trim()) ||
    primarySelection !== null ||
    secondarySelection !== null ||
    hasSearched

  const filteredComparisonState = useMemo<ComparisonSearchState | null>(() => {
    if (!comparisonState) {
      return null
    }

    if (comparisonState.kind === 'actors') {
      return {
        kind: 'actors',
        result: filterCommonTitlesResult(comparisonState.result, 'visible-only'),
      }
    }

    return {
      kind: 'titles',
      result: filterCommonCastResult(comparisonState.result, 'visible-only'),
    }
  }, [comparisonState])

  const displayedComparisonState = useMemo<ComparisonSearchState | null>(() => {
    if (!comparisonState) {
      return null
    }

    return isFilteringVisibleOnly ? filteredComparisonState : comparisonState
  }, [comparisonState, filteredComparisonState, isFilteringVisibleOnly])

  const resultGroups = useMemo<ResultCardGroup[]>(() => {
    if (!displayedComparisonState) {
      return []
    }

    if (displayedComparisonState.kind === 'actors') {
      const highlightedTitles = pickHighlightedActorTitles(displayedComparisonState.result.sharedTitles)
      const highlightedTitleKeys = new Set(highlightedTitles.map(({ title }) => getSharedTitleKey(title)))
      const remainingTitles = displayedComparisonState.result.sharedTitles
        .filter((title) => !highlightedTitleKeys.has(getSharedTitleKey(title)))
        .sort(compareTitlesByPopularity)

      const featuredTitles = remainingTitles.filter(
        (title) => isStarBillingOrder(title.leftOrder) || isStarBillingOrder(title.rightOrder),
      )
      const extraTitles = remainingTitles.filter(
        (title) => !isStarBillingOrder(title.leftOrder) && !isStarBillingOrder(title.rightOrder),
      )

      return [
        ...(highlightedTitles.length
          ? [
              {
                id: 'highlights',
                cards: highlightedTitles.map(({ title, metaLabel }) => ({
                  ...mapSharedTitleToCard(title),
                  metaLabel,
                })),
              },
            ]
          : []),
        ...buildResultGroups(featuredTitles.map(mapSharedTitleToCard), extraTitles.map(mapSharedTitleToCard)),
      ]
    }

    const featuredActors = displayedComparisonState.result.sharedActors.filter((actor) => actor.roleCategory !== 'extra-both')
    const extraActors = displayedComparisonState.result.sharedActors
      .filter((actor) => actor.roleCategory === 'extra-both')
      .sort(compareExtraActorsForTitles)

    return buildResultGroups(featuredActors.map(mapSharedActorToCard), extraActors.map(mapSharedActorToCard))
  }, [displayedComparisonState])

  const resultCount = getComparisonResultCount(displayedComparisonState)
  const shouldShowFilterToggle = mode !== 'bacon' && resultCount > 0
  const shouldShowClearButton = mode !== 'bacon' && resultCount > 0

  useEffect(() => {
    if (mode === 'bacon' || !comparisonState || !filterExtras || showingHiddenExtras) {
      return
    }

    const allCount = getComparisonResultCount(comparisonState)
    const filteredCount = getComparisonResultCount(filteredComparisonState)
    if (allCount > 0 && filteredCount === 0) {
      setShowingHiddenExtras(true)
    }
  }, [comparisonState, filteredComparisonState, filterExtras, mode, showingHiddenExtras])

  const clearSearchResults = () => {
    setComparisonState(null)
    setBaconResult(null)
  }

  const resetSelectionsAndResults = () => {
    searchRequestIdRef.current += 1
    lastCompletedSearchKeyRef.current = null
    setPrimaryQuery('')
    setSecondaryQuery('')
    setPrimarySelection(null)
    setSecondarySelection(null)
    setHasSearched(false)
    setIsLoading(false)
    setErrorMessage(null)
    setShowingHiddenExtras(false)
    clearSearchResults()
  }

  const handleModeChange = (nextMode: SearchMode) => {
    if (nextMode === mode) {
      return
    }

    setMode(nextMode)
    resetSelectionsAndResults()
  }

  const handlePrimaryInputChange = (value: string) => {
    setPrimaryQuery(value)
    setErrorMessage(null)
    setShowingHiddenExtras(false)
    if (primarySelection && getSelectionLabel(primarySelection) !== value) {
      setPrimarySelection(null)
    }
  }

  const handleSecondaryInputChange = (value: string) => {
    setSecondaryQuery(value)
    setErrorMessage(null)
    setShowingHiddenExtras(false)
    if (secondarySelection && getSelectionLabel(secondarySelection) !== value) {
      setSecondarySelection(null)
    }
  }

  const handlePrimarySelect = (selection: SearchSelection) => {
    setPrimarySelection(selection)
    setPrimaryQuery(getSelectionLabel(selection))
    setErrorMessage(null)
  }

  const handleSecondarySelect = (selection: SearchSelection) => {
    setSecondarySelection(selection)
    setSecondaryQuery(getSelectionLabel(selection))
    setErrorMessage(null)
  }

  const clearPrimarySelection = () => {
    setPrimarySelection(null)
    setPrimaryQuery('')
    setErrorMessage(null)
    setShowingHiddenExtras(false)
  }

  const clearSecondarySelection = () => {
    setSecondarySelection(null)
    setSecondaryQuery('')
    setErrorMessage(null)
    setShowingHiddenExtras(false)
  }

  const handleRandomMatch = async () => {
    if (mode === 'bacon') {
      return
    }

    const requestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = requestId
    setHasSearched(true)
    setIsLoading(true)
    setErrorMessage(null)
    setShowingHiddenExtras(false)
    clearSearchResults()

    try {
      if (mode === 'titles') {
        const { selection, result } = await findRandomCommonCastMatch()
        if (searchRequestIdRef.current !== requestId) {
          return
        }

        setPrimarySelection(selection.left)
        setSecondarySelection(selection.right)
        setPrimaryQuery(selection.left.title)
        setSecondaryQuery(selection.right.title)
        setComparisonState({ kind: 'titles', result })
        lastCompletedSearchKeyRef.current = getActiveSearchKey('titles', selection.left, selection.right)
      } else {
        const { selection, result } = await findRandomCommonTitlesMatch()
        if (searchRequestIdRef.current !== requestId) {
          return
        }

        setPrimarySelection(selection.left)
        setSecondarySelection(selection.right)
        setPrimaryQuery(selection.left.name)
        setSecondaryQuery(selection.right.name)
        setComparisonState({ kind: 'actors', result })
        lastCompletedSearchKeyRef.current = getActiveSearchKey('actors', selection.left, selection.right)
      }
    } catch (error) {
      if (searchRequestIdRef.current !== requestId) {
        return
      }
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create a random match.')
      lastCompletedSearchKeyRef.current = null
    } finally {
      if (searchRequestIdRef.current === requestId) {
        setIsLoading(false)
      }
    }
  }

  const handleRandomBaconActor = async () => {
    if (mode !== 'bacon' || isPickingRandomBaconActor || isPersonSelection(primarySelection)) {
      return
    }

    setIsPickingRandomBaconActor(true)
    setErrorMessage(null)

    try {
      const selection = await findRandomBaconActor(isPersonSelection(primarySelection) ? primarySelection : null)
      setPrimarySelection(selection)
      setPrimaryQuery(selection.name)
      setShowingHiddenExtras(false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to pick a random actor.')
    } finally {
      setIsPickingRandomBaconActor(false)
    }
  }

  useEffect(() => {
    if (!activeSearchKey) {
      searchRequestIdRef.current += 1
      lastCompletedSearchKeyRef.current = null
      setIsLoading(false)
      setHasSearched(false)
      setErrorMessage(null)
      setShowingHiddenExtras(false)
      clearSearchResults()
      return
    }

    const duplicateSelectionMessage = getDuplicateSelectionMessage(mode, primarySelection, secondarySelection)
    if (duplicateSelectionMessage) {
      searchRequestIdRef.current += 1
      lastCompletedSearchKeyRef.current = null
      setHasSearched(true)
      setIsLoading(false)
      setErrorMessage(duplicateSelectionMessage)
      setShowingHiddenExtras(false)
      clearSearchResults()
      return
    }

    if (lastCompletedSearchKeyRef.current === activeSearchKey) {
      return
    }

    const requestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = requestId
    setHasSearched(true)
    setIsLoading(true)
    setErrorMessage(null)
    setShowingHiddenExtras(false)
    clearSearchResults()

    const runSearch = async () => {
      if (mode === 'actors' && isPersonSelection(primarySelection) && isPersonSelection(secondarySelection)) {
        const result = await findCommonTitlesFromPeople(primarySelection, secondarySelection, 'all')
        if (searchRequestIdRef.current !== requestId) {
          return
        }
        setComparisonState({ kind: 'actors', result })
      } else if (mode === 'titles' && isMediaSelection(primarySelection) && isMediaSelection(secondarySelection)) {
        const result = await findCommonCastFromMedia(primarySelection, secondarySelection, 'all')
        if (searchRequestIdRef.current !== requestId) {
          return
        }
        setComparisonState({ kind: 'titles', result })
      } else if (mode === 'bacon' && isPersonSelection(primarySelection)) {
        const result = await findBaconConnectionFromPerson(primarySelection)
        if (searchRequestIdRef.current !== requestId) {
          return
        }
        setBaconResult(result)
      } else {
        return
      }

      lastCompletedSearchKeyRef.current = activeSearchKey
      setIsLoading(false)
    }

    runSearch().catch((error) => {
      if (searchRequestIdRef.current !== requestId) {
        return
      }

      lastCompletedSearchKeyRef.current = null
      clearSearchResults()
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong while fetching TMDB data.')
      setIsLoading(false)
    })
  }, [activeSearchKey, mode, primarySelection, secondarySelection])

  const primaryFieldConfig =
    mode === 'titles'
      ? {
          suggestions: primaryMediaAutocomplete.suggestions,
          selectedEntity: isMediaSelection(primarySelection) ? primarySelection : null,
          isLoading: primaryMediaAutocomplete.isLoading,
          hasSearched: primaryMediaAutocomplete.hasSearched,
          inputKind: 'media' as const,
        }
      : {
          suggestions: primaryPersonAutocomplete.suggestions,
          selectedEntity: isPersonSelection(primarySelection) ? primarySelection : null,
          isLoading: primaryPersonAutocomplete.isLoading,
          hasSearched: primaryPersonAutocomplete.hasSearched,
          inputKind: 'person' as const,
        }

  const baconTrailingAction =
    mode === 'bacon' && !isPersonSelection(primarySelection) ? (
      <button
        type="button"
        className="search-inline-action-button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={handleRandomBaconActor}
        disabled={isPickingRandomBaconActor}
      >
        {isPickingRandomBaconActor ? 'Picking…' : 'Surprise Me'}
      </button>
    ) : undefined

  const secondaryFieldConfig =
    mode === 'titles'
      ? {
          suggestions: secondaryMediaAutocomplete.suggestions,
          selectedEntity: isMediaSelection(secondarySelection) ? secondarySelection : null,
          isLoading: secondaryMediaAutocomplete.isLoading,
          hasSearched: secondaryMediaAutocomplete.hasSearched,
          inputKind: 'media' as const,
        }
      : {
          suggestions: secondaryPersonAutocomplete.suggestions,
          selectedEntity: isPersonSelection(secondarySelection) ? secondarySelection : null,
          isLoading: secondaryPersonAutocomplete.isLoading,
          hasSearched: secondaryPersonAutocomplete.hasSearched,
          inputKind: 'person' as const,
        }

  return (
    <div className="app-shell">
      <AppNav onAboutOpen={() => setAboutOpen(true)} onHowItWorksOpen={() => setHowItWorksOpen(true)} />

      <main className="app-main">
        <HeroHeader mode={mode} onModeChange={handleModeChange} />

        <section className="search-panel">
          <div className="search-panel-toolbar">
            {shouldShowClearButton ? (
              <button
                type="button"
                className="clear-search-button"
                onClick={resetSelectionsAndResults}
                disabled={!canClearSearchFields}
              >
                Clear Both Fields
              </button>
            ) : (
              <p className="search-panel-helper-text">Find the links between actors, movies, and shows</p>
            )}
          </div>

          <div className={`search-row${mode === 'bacon' ? ' search-row-single' : ''}`}>
            <SearchAutocompleteField
              label={mode === 'titles' ? 'First title' : 'First actor'}
              value={primaryQuery}
              placeholder={PRIMARY_PLACEHOLDERS[mode]}
              inputKind={primaryFieldConfig.inputKind}
              suggestions={primaryFieldConfig.suggestions}
              selectedEntity={primaryFieldConfig.selectedEntity}
              isLoading={primaryFieldConfig.isLoading}
              minimumQueryLength={AUTOCOMPLETE_MIN_QUERY_LENGTH}
              hasSearched={primaryFieldConfig.hasSearched}
              trailingAction={baconTrailingAction}
              onChange={handlePrimaryInputChange}
              onSelect={handlePrimarySelect}
              onClearSelection={clearPrimarySelection}
            />

            {mode !== 'bacon' ? <div className="search-row-plus" aria-hidden="true">+</div> : null}

            {mode !== 'bacon' ? (
              <SearchAutocompleteField
                label={mode === 'titles' ? 'Second title' : 'Second actor'}
                value={secondaryQuery}
                placeholder={SECONDARY_PLACEHOLDERS[mode as 'actors' | 'titles']}
                inputKind={secondaryFieldConfig.inputKind}
                suggestions={secondaryFieldConfig.suggestions}
                selectedEntity={secondaryFieldConfig.selectedEntity}
                isLoading={secondaryFieldConfig.isLoading}
                minimumQueryLength={AUTOCOMPLETE_MIN_QUERY_LENGTH}
                hasSearched={secondaryFieldConfig.hasSearched}
                onChange={handleSecondaryInputChange}
                onSelect={handleSecondarySelect}
                onClearSelection={clearSecondarySelection}
              />
            ) : null}
          </div>

          {shouldShowFilterToggle ? (
            <div className="search-panel-filter-row">
              <FilterToggle
                checked={isFilteringVisibleOnly}
                onChange={(checked) => {
                  setFilterExtras(checked)
                  setShowingHiddenExtras(false)
                }}
              />
            </div>
          ) : null}

          {mode !== 'bacon' && SHOW_RANDOM_MATCH ? (
            <div className="search-panel-actions">
              <button type="button" className="random-match-button" onClick={handleRandomMatch} disabled={isLoading}>
                Random Match
              </button>
            </div>
          ) : null}

          {mode === 'bacon' ? <BaconPathSection isLoading={isLoading} errorMessage={errorMessage} result={baconResult} /> : null}
        </section>

        {mode !== 'bacon' ? (
          <ResultsSection
            hasSearched={hasSearched}
            isLoading={isLoading}
            resultCount={resultCount}
            groups={resultGroups}
            emptyDescription={
              mode === 'actors'
                ? 'Try searching for different actors to see shared titles.'
                : 'Try searching for different titles to see overlapping cast.'
            }
            errorMessage={errorMessage}
            showingHiddenExtras={showingHiddenExtras}
          />
        ) : null}
      </main>

      <TmdbFooter />

      <HowItWorksDialog open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}

export default App
