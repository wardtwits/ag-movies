import { useEffect, useMemo, useRef, useState } from 'react'
import { CommonCastForm } from './components/CommonCastForm'
import { ResultsGallery, type ResultGalleryCard } from './components/ResultsGallery'
import type { MediaTitle, PersonSummary } from './domain/media'
import {
  AUTOCOMPLETE_MIN_QUERY_LENGTH,
  fetchMediaSuggestions,
  fetchPersonSuggestions,
  useAutocompleteSuggestions,
} from './features/autocomplete/useAutocompleteSuggestions'
import { findBaconConnectionFromPerson } from './features/bacon-law/baconLawService'
import type { BaconLawResult } from './features/bacon-law/types'
import { findCommonCastFromMedia } from './features/common-cast/commonCastService'
import type { CommonCastResult, SharedActorRoleCategory } from './features/common-cast/types'
import { findCommonTitlesFromPeople } from './features/common-titles/commonTitlesService'
import type { CommonTitlesResult } from './features/common-titles/types'
import { findRandomCommonCastMatch, findRandomCommonTitlesMatch } from './features/random-match/randomMatchService'
import './App.css'

type SearchMode = 'tv-film' | 'actor' | 'bacon-law'
type SearchSelection = MediaTitle | PersonSummary

const isMediaSelection = (selection: SearchSelection | null): selection is MediaTitle =>
  selection !== null && 'mediaType' in selection

const isPersonSelection = (selection: SearchSelection | null): selection is PersonSummary =>
  selection !== null && !('mediaType' in selection)

const getSelectionLabel = (selection: SearchSelection): string => ('mediaType' in selection ? selection.title : selection.name)

const getMediaMeta = (mediaType: 'movie' | 'tv', releaseDate?: string): string => {
  const kindLabel = mediaType === 'movie' ? 'Movie' : 'TV'
  const releaseYear = releaseDate?.slice(0, 4)
  return releaseYear ? `${kindLabel} • ${releaseYear}` : kindLabel
}

const getRoleSummary = (leftCharacter?: string, rightCharacter?: string): string => {
  if (leftCharacter && rightCharacter) {
    return `${leftCharacter} / ${rightCharacter}`
  }
  if (leftCharacter || rightCharacter) {
    return `As ${leftCharacter ?? rightCharacter}`
  }
  return 'Shared cast'
}

const getRoleCategoryLabel = (category: SharedActorRoleCategory): string => {
  switch (category) {
    case 'star-both':
      return 'Star on both'
    case 'mixed':
      return 'Star on one only'
    case 'extra-both':
      return 'Extra/supporting on both'
  }
}

const getAutoSearchKey = (
  mode: SearchMode,
  leftSelection: SearchSelection | null,
  rightSelection: SearchSelection | null,
): string | null => {
  if (mode === 'tv-film' && isMediaSelection(leftSelection) && isMediaSelection(rightSelection)) {
    return `tv-film:${leftSelection.id}:${rightSelection.id}`
  }

  if (mode === 'actor' && isPersonSelection(leftSelection) && isPersonSelection(rightSelection)) {
    return `actor:${leftSelection.id}:${rightSelection.id}`
  }

  if (mode === 'bacon-law' && isPersonSelection(leftSelection)) {
    return `bacon-law:${leftSelection.id}`
  }

  return null
}

const buildBaconCards = (result: BaconLawResult): ResultGalleryCard[] => {
  if (!result.steps.length) {
    return [
      {
        id: `actor-${result.actor.person.id}`,
        title: result.actor.person.name,
        subtitle: 'Kevin Bacon',
        detail: 'Degree 0',
        imagePath: result.actor.person.profilePath,
        visual: 'featured',
      },
    ]
  }

  const cards: ResultGalleryCard[] = [
    {
      id: `actor-${result.actor.person.id}`,
      title: result.actor.person.name,
      subtitle: result.steps[0].fromCharacter ? `As ${result.steps[0].fromCharacter}` : 'Selected actor',
      detail: 'Start',
      imagePath: result.actor.person.profilePath,
      visual: 'person',
    },
  ]

  result.steps.forEach((step, index) => {
    cards.push({
      id: `media-${index}-${step.media.mediaType}-${step.media.id}`,
      title: step.media.title,
      subtitle: getMediaMeta(step.media.mediaType, step.media.releaseDate),
      detail: `${step.fromActor.name} to ${step.toActor.name}`,
      imagePath: step.media.posterPath,
      visual: step.media.mediaType,
    })

    const isKevinBacon = step.toActor.id === result.kevinBacon.person.id
    cards.push({
      id: `actor-${index}-${step.toActor.id}`,
      title: step.toActor.name,
      subtitle: step.toCharacter ? `As ${step.toCharacter}` : isKevinBacon ? 'Kevin Bacon' : 'Bridge actor',
      detail: isKevinBacon ? `Degree ${result.degree}` : undefined,
      imagePath: step.toActor.profilePath,
      visual: isKevinBacon ? 'featured' : 'person',
    })
  })

  return cards
}

function App() {
  const [searchMode, setSearchMode] = useState<SearchMode>('tv-film')
  const [leftTitle, setLeftTitle] = useState('')
  const [rightTitle, setRightTitle] = useState('')
  const [leftSelection, setLeftSelection] = useState<SearchSelection | null>(null)
  const [rightSelection, setRightSelection] = useState<SearchSelection | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [commonCastResult, setCommonCastResult] = useState<CommonCastResult | null>(null)
  const [commonTitlesResult, setCommonTitlesResult] = useState<CommonTitlesResult | null>(null)
  const [baconLawResult, setBaconLawResult] = useState<BaconLawResult | null>(null)
  const searchRequestIdRef = useRef(0)
  const lastCompletedSearchKeyRef = useRef<string | null>(null)

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

  const activeSearchKey = useMemo(
    () => getAutoSearchKey(searchMode, leftSelection, rightSelection),
    [leftSelection, rightSelection, searchMode],
  )

  const clearResults = () => {
    setCommonCastResult(null)
    setCommonTitlesResult(null)
    setBaconLawResult(null)
  }

  const handleSearchModeChange = (mode: SearchMode) => {
    if (mode === searchMode) {
      return
    }

    searchRequestIdRef.current += 1
    lastCompletedSearchKeyRef.current = null
    setSearchMode(mode)
    setLeftTitle('')
    setRightTitle('')
    setLeftSelection(null)
    setRightSelection(null)
    setErrorMessage(null)
    setIsLoading(false)
    clearResults()
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

  const handleRandomMatch = async () => {
    if (searchMode === 'bacon-law') {
      return
    }

    searchRequestIdRef.current += 1
    setIsLoading(true)
    setErrorMessage(null)

    try {
      if (searchMode === 'tv-film') {
        const { selection, result } = await findRandomCommonCastMatch()
        lastCompletedSearchKeyRef.current = getAutoSearchKey('tv-film', selection.left, selection.right)
        setLeftTitle(selection.left.title)
        setRightTitle(selection.right.title)
        setLeftSelection(selection.left)
        setRightSelection(selection.right)
        setCommonCastResult(result)
        setCommonTitlesResult(null)
        setBaconLawResult(null)
      } else {
        const { selection, result } = await findRandomCommonTitlesMatch()
        lastCompletedSearchKeyRef.current = getAutoSearchKey('actor', selection.left, selection.right)
        setLeftTitle(selection.left.name)
        setRightTitle(selection.right.name)
        setLeftSelection(selection.left)
        setRightSelection(selection.right)
        setCommonTitlesResult(result)
        setCommonCastResult(null)
        setBaconLawResult(null)
      }
    } catch (error) {
      lastCompletedSearchKeyRef.current = null
      clearResults()
      const message = error instanceof Error ? error.message : 'Something went wrong while generating a random match.'
      setErrorMessage(message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!activeSearchKey) {
      searchRequestIdRef.current += 1
      lastCompletedSearchKeyRef.current = null
      setIsLoading(false)
      setErrorMessage(null)
      clearResults()
      return
    }

    if (lastCompletedSearchKeyRef.current === activeSearchKey) {
      return
    }

    const requestId = searchRequestIdRef.current + 1
    searchRequestIdRef.current = requestId
    setIsLoading(true)
    setErrorMessage(null)
    clearResults()

    const runSearch = async () => {
      if (searchMode === 'tv-film' && isMediaSelection(leftSelection) && isMediaSelection(rightSelection)) {
        const result = await findCommonCastFromMedia(leftSelection, rightSelection)
        if (searchRequestIdRef.current !== requestId) {
          return
        }
        setCommonCastResult(result)
      } else if (searchMode === 'actor' && isPersonSelection(leftSelection) && isPersonSelection(rightSelection)) {
        const result = await findCommonTitlesFromPeople(leftSelection, rightSelection)
        if (searchRequestIdRef.current !== requestId) {
          return
        }
        setCommonTitlesResult(result)
      } else if (searchMode === 'bacon-law' && isPersonSelection(leftSelection)) {
        const result = await findBaconConnectionFromPerson(leftSelection)
        if (searchRequestIdRef.current !== requestId) {
          return
        }
        setBaconLawResult(result)
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
      clearResults()
      const message = error instanceof Error ? error.message : 'Something went wrong while fetching TMDB data.'
      setErrorMessage(message)
      setIsLoading(false)
    })
  }, [activeSearchKey, leftSelection, rightSelection, searchMode])

  const resultsView = useMemo(() => {
    if (searchMode === 'tv-film' && commonCastResult) {
      return {
        heading: `Results (${commonCastResult.sharedActors.length})`,
        context: `Shared cast between ${commonCastResult.left.media.title} and ${commonCastResult.right.media.title}`,
        emptyMessage: 'No overlapping actors were found for this pair.',
        cards: commonCastResult.sharedActors.map<ResultGalleryCard>((actor) => ({
          id: `actor-${actor.id}`,
          title: actor.name,
          subtitle: getRoleSummary(actor.leftCharacter, actor.rightCharacter),
          detail: getRoleCategoryLabel(actor.roleCategory),
          imagePath: actor.profilePath,
          visual: 'person',
        })),
      }
    }

    if (searchMode === 'actor' && commonTitlesResult) {
      return {
        heading: `Results (${commonTitlesResult.sharedTitles.length})`,
        context: `Shared titles between ${commonTitlesResult.left.person.name} and ${commonTitlesResult.right.person.name}`,
        emptyMessage: 'No overlapping TV/film titles were found for this pair.',
        cards: commonTitlesResult.sharedTitles.map<ResultGalleryCard>((title) => {
          const subtitle = title.leftCharacter || title.rightCharacter
            ? getRoleSummary(title.leftCharacter, title.rightCharacter)
            : getMediaMeta(title.mediaType, title.releaseDate)

          return {
            id: `${title.mediaType}-${title.id}`,
            title: title.title,
            subtitle,
            detail:
              title.leftCharacter || title.rightCharacter
                ? getMediaMeta(title.mediaType, title.releaseDate)
                : undefined,
            imagePath: title.posterPath,
            visual: title.mediaType,
          }
        }),
      }
    }

    if (searchMode === 'bacon-law' && baconLawResult) {
      return {
        heading: `Bacon Number ${baconLawResult.degree}`,
        context:
          baconLawResult.degree === 0
            ? `${baconLawResult.actor.person.name} is Kevin Bacon.`
            : `Shortest path from ${baconLawResult.actor.person.name} to Kevin Bacon`,
        emptyMessage: 'No Bacon path was found.',
        cards: buildBaconCards(baconLawResult),
      }
    }

    return null
  }, [baconLawResult, commonCastResult, commonTitlesResult, searchMode])

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

  const activeFormContent =
    searchMode === 'tv-film'
      ? {
          leftLabel: 'Movie / TV title 1',
          rightLabel: 'Movie / TV title 2',
          leftPlaceholder: 'Example: The Matrix',
          rightPlaceholder: 'Example: John Wick',
          showRightInput: true,
        }
      : searchMode === 'actor'
        ? {
            leftLabel: 'Actor 1',
            rightLabel: 'Actor 2',
            leftPlaceholder: 'Example: Kelsey Grammer',
            rightPlaceholder: 'Example: Peri Gilpin',
            showRightInput: true,
          }
        : {
            leftLabel: 'Actor',
            rightLabel: '',
            leftPlaceholder: 'Example: Carrie Fisher',
            rightPlaceholder: '',
            showRightInput: false,
          }

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
              ? 'Select two titles and shared cast will appear automatically.'
              : searchMode === 'actor'
                ? 'Select two actors and common credits will load automatically.'
                : 'Select one actor and the Kevin Bacon path will load automatically.'}
          </p>

          <CommonCastForm
            leftTitle={leftTitle}
            rightTitle={rightTitle}
            isLoading={isLoading}
            leftLabel={activeFormContent.leftLabel}
            rightLabel={activeFormContent.rightLabel}
            leftPlaceholder={activeFormContent.leftPlaceholder}
            rightPlaceholder={activeFormContent.rightPlaceholder}
            secondaryActionLabel={searchMode === 'bacon-law' ? undefined : 'Random Match'}
            leftAutocomplete={leftAutocomplete}
            rightAutocomplete={rightAutocomplete}
            onLeftTitleChange={handleLeftInputChange}
            onRightTitleChange={handleRightInputChange}
            onSecondaryAction={searchMode === 'bacon-law' ? undefined : handleRandomMatch}
            showRightInput={activeFormContent.showRightInput}
          />
        </section>

        {isLoading ? <p className="status status-loading">{loadingMessage}</p> : null}
        {errorMessage ? <p className="status status-error">{errorMessage}</p> : null}

        {resultsView ? (
          <ResultsGallery
            heading={resultsView.heading}
            context={resultsView.context}
            cards={resultsView.cards}
            emptyMessage={resultsView.emptyMessage}
          />
        ) : null}
      </main>
    </div>
  )
}

export default App
