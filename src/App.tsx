import { useEffect, useMemo, useRef, useState } from 'react'
import { AboutDialog } from './components/AboutDialog'
import { ActorConnectionSpotlight } from './components/ActorConnectionSpotlight'
import { AppNav } from './components/AppNav'
import { BaconPathSection } from './components/BaconPathSection'
import { HeroHeader, type SearchMode } from './components/HeroHeader'
import { HowItWorksDialog } from './components/HowItWorksDialog'
import type { ResultCardData } from './components/ResultCard'
import { ResultsSection, type ResultCardGroup } from './components/ResultsSection'
import { SearchAutocompleteField } from './components/SearchAutocompleteField'
import { TitleConnectionSpotlight } from './components/TitleConnectionSpotlight'
import { TmdbFooter } from './components/TmdbFooter'
import { isStarBillingOrder } from './domain/billing'
import type { MediaTitle, PersonSummary } from './domain/media'
import {
  fetchActorSuggestions,
  fetchAutocompleteActorSuggestions,
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
import type { SharedActor } from './features/common-cast/types'
import {
  filterCommonTitlesResult,
  findCommonTitlesFromPeople,
} from './features/common-titles/commonTitlesService'
import type { SharedTitle } from './features/common-titles/types'
import {
  findRandomBaconActor,
  findRandomCommonCastMatch,
  findRandomCommonTitlesMatch,
} from './features/random-match/randomMatchService'
import {
  createShareUrl,
  parseShareSnapshotFromHash,
  type ShareComparisonState,
  type ShareSelection,
} from './features/share/shareState'
import { configureNativeAppChrome, isNativeApp, shareNativeLink } from './platform/native'
import './App.css'

type SearchSelection = MediaTitle | PersonSummary

type ComparisonSearchState = ShareComparisonState
type SpotlightMetaLabel = 'Most Popular' | 'Earliest' | 'Most Recent'
type ActorSpotlightTitleCard = ResultCardData & { metaLabel?: SpotlightMetaLabel }
type TitleSpotlightActorCard = Pick<ResultCardData, 'id' | 'title' | 'subtitle' | 'href' | 'imagePath'>

interface ActorSpotlightData {
  leftActor: PersonSummary
  rightActor: PersonSummary
  titles: ActorSpotlightTitleCard[]
}

interface TitleSpotlightData {
  leftTitle: MediaTitle
  rightTitle: MediaTitle
  actors: TitleSpotlightActorCard[]
}

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
  titleMeta: title.releaseDate?.slice(0, 4),
  subtitle: joinCharacterSummary(title.leftCharacter, title.rightCharacter)
    ? `As ${joinCharacterSummary(title.leftCharacter, title.rightCharacter)}`
    : formatMediaMeta(title.mediaType, title.releaseDate),
  href: tmdbMediaHref(title.mediaType, title.id),
  imagePath: title.posterPath,
})

const getSharedTitleKey = (title: SharedTitle): string => `${title.mediaType}-${title.id}`
const compareImageAvailability = (leftPath?: string | null, rightPath?: string | null): number => {
  const leftHasImage = Boolean(leftPath)
  const rightHasImage = Boolean(rightPath)

  if (leftHasImage === rightHasImage) {
    return 0
  }

  return leftHasImage ? -1 : 1
}

const compareTitlesByPopularity = (left: SharedTitle, right: SharedTitle): number => {
  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity
  }

  if (right.voteCount !== left.voteCount) {
    return right.voteCount - left.voteCount
  }

  return left.title.localeCompare(right.title)
}

const compareTitlesForResults = (left: SharedTitle, right: SharedTitle): number => {
  const imageDelta = compareImageAvailability(left.posterPath, right.posterPath)
  if (imageDelta !== 0) {
    return imageDelta
  }

  return compareTitlesByPopularity(left, right)
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
): Array<{ title: SharedTitle; metaLabel?: SpotlightMetaLabel }> => {
  const highlighted: Array<{ title: SharedTitle; metaLabel?: SpotlightMetaLabel }> = []
  const usedKeys = new Set<string>()

  const pickNext = (title: SharedTitle | undefined, metaLabel?: SpotlightMetaLabel) => {
    if (!title) {
      return
    }

    usedKeys.add(getSharedTitleKey(title))
    highlighted.push({ title, metaLabel })
  }

  const earliestTitle = [...titles.filter((title) => Boolean(title.releaseDate))].sort(compareTitlesByEarliestRelease)[0]
  pickNext(earliestTitle, 'Earliest')

  const mostRecentTitle = [...titles.filter((title) => !usedKeys.has(getSharedTitleKey(title)) && Boolean(title.releaseDate))].sort(
    compareTitlesByMostRecentRelease,
  )[0]
  pickNext(mostRecentTitle, 'Most Recent')

  const mostPopularTitle = [...titles].sort(compareTitlesByPopularity)[0]
  if (mostPopularTitle && !usedKeys.has(getSharedTitleKey(mostPopularTitle))) {
    pickNext(mostPopularTitle, 'Most Popular')
  }

  return highlighted
}

const buildActorSpotlightTitles = (titles: SharedTitle[]): ActorSpotlightTitleCard[] => {
  if (!titles.length) {
    return []
  }

  const sortedTitles = [...titles].sort(compareTitlesByPopularity)
  const starTitles = sortedTitles.filter((title) => isStarBillingOrder(title.leftOrder) || isStarBillingOrder(title.rightOrder))
  const preferredTitles = starTitles.length ? starTitles : sortedTitles
  const highlighted = pickHighlightedActorTitles(preferredTitles)
  const highlightedKeys = new Set(highlighted.map(({ title }) => getSharedTitleKey(title)))
  const targetCount = Math.min(3, sortedTitles.length)

  for (const title of sortedTitles) {
    if (highlighted.length >= targetCount) {
      break
    }

    const titleKey = getSharedTitleKey(title)
    if (highlightedKeys.has(titleKey)) {
      continue
    }

    highlighted.push({ title })
    highlightedKeys.add(titleKey)
  }

  return highlighted.map(({ title, metaLabel }) => ({
    ...mapSharedTitleToCard(title),
    metaLabel,
  }))
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
const getRoleCategoryPriority = (actor: SharedActor): number =>
  actor.roleCategory === 'star-both' ? 0 : actor.roleCategory === 'mixed' ? 1 : 2

const compareFeaturedActorsForSpotlight = (left: SharedActor, right: SharedActor): number => {
  const roleCategoryDelta = getRoleCategoryPriority(left) - getRoleCategoryPriority(right)
  if (roleCategoryDelta !== 0) {
    return roleCategoryDelta
  }

  const billingDelta = getBestBillingOrder(left) - getBestBillingOrder(right)
  if (billingDelta !== 0) {
    return billingDelta
  }

  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity
  }

  return left.name.localeCompare(right.name)
}

const buildTitleSpotlightActors = (actors: SharedActor[]): TitleSpotlightActorCard[] =>
  [...actors].sort(compareFeaturedActorsForSpotlight).slice(0, 4).map(mapSharedActorToCard)

const compareFeaturedActorsForResults = (left: SharedActor, right: SharedActor): number => {
  const imageDelta = compareImageAvailability(left.profilePath, right.profilePath)
  if (imageDelta !== 0) {
    return imageDelta
  }

  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity
  }

  return left.name.localeCompare(right.name)
}

const compareExtraActorsForTitles = (left: SharedActor, right: SharedActor): number => {
  const imageDelta = compareImageAvailability(left.profilePath, right.profilePath)
  if (imageDelta !== 0) {
    return imageDelta
  }

  const billingDelta = getBestBillingOrder(left) - getBestBillingOrder(right)
  if (billingDelta !== 0) {
    return billingDelta
  }

  if (right.popularity !== left.popularity) {
    return right.popularity - left.popularity
  }

  return left.name.localeCompare(right.name)
}

const PRIMARY_PLACEHOLDERS: Record<SearchMode, string> = {
  actors: 'Actor 1',
  titles: 'Film or Show 1',
  bacon: "Actor's name",
}

const SECONDARY_PLACEHOLDERS: Record<Exclude<SearchMode, 'bacon'>, string> = {
  actors: 'Actor 2',
  titles: 'Film or Show 2',
}

const SHOW_RANDOM_MATCH = false
const MOBILE_LAYOUT_QUERY = '(max-width: 47.99rem)'

const easeInOutCubic = (progress: number): number =>
  progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2

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
  const [revealedResultToken, setRevealedResultToken] = useState(0)
  const [shareCopyState, setShareCopyState] = useState<'idle' | 'copied' | 'error'>('idle')
  const [aboutOpen, setAboutOpen] = useState(false)
  const [howItWorksOpen, setHowItWorksOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_LAYOUT_QUERY).matches
      : false,
  )
  const searchRequestIdRef = useRef(0)
  const lastCompletedSearchKeyRef = useRef<string | null>(null)
  const shareCopyResetTimeoutRef = useRef<number | null>(null)
  const resultsScrollTargetRef = useRef<HTMLDivElement | null>(null)
  const topScrollTargetRef = useRef<HTMLElement | null>(null)
  const lastScrolledResultTokenRef = useRef(0)
  const [showBackToTopLink, setShowBackToTopLink] = useState(false)

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
    loader:
      mode === 'bacon'
        ? fetchActorSuggestions
        : mode === 'actors'
          ? fetchAutocompleteActorSuggestions
          : fetchPersonSuggestions,
  })
  const secondaryPersonAutocomplete = useAutocompleteSuggestions(secondaryQuery, {
    enabled: mode === 'actors',
    loader: fetchAutocompleteActorSuggestions,
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

  const actorSpotlight = useMemo<ActorSpotlightData | null>(() => {
    if (!displayedComparisonState || displayedComparisonState.kind !== 'actors') {
      return null
    }

    const titles = buildActorSpotlightTitles(displayedComparisonState.result.sharedTitles)
    if (!titles.length) {
      return null
    }

    return {
      leftActor: displayedComparisonState.result.left.person,
      rightActor: displayedComparisonState.result.right.person,
      titles,
    }
  }, [displayedComparisonState])

  const titleSpotlight = useMemo<TitleSpotlightData | null>(() => {
    if (!displayedComparisonState || displayedComparisonState.kind !== 'titles') {
      return null
    }

    const featuredActors = displayedComparisonState.result.sharedActors.filter((actor) => actor.roleCategory !== 'extra-both')
    const actors = buildTitleSpotlightActors(featuredActors)
    if (!actors.length && !isMobileViewport) {
      return null
    }

    return {
      leftTitle: displayedComparisonState.result.left.media,
      rightTitle: displayedComparisonState.result.right.media,
      actors,
    }
  }, [displayedComparisonState, isMobileViewport])

  const resultGroups = useMemo<ResultCardGroup[]>(() => {
    if (!displayedComparisonState) {
      return []
    }

    if (displayedComparisonState.kind === 'actors') {
      const sortedTitles = [...displayedComparisonState.result.sharedTitles].sort(compareTitlesForResults)
      const spotlightMetaById = new Map(
        (actorSpotlight?.titles ?? []).map((title) => [title.id, title.metaLabel] as const),
      )

      if (isMobileViewport) {
        const cards = sortedTitles.map((title) => {
          const card = mapSharedTitleToCard(title)
          const metaLabel = spotlightMetaById.get(card.id)
          return metaLabel ? { ...card, metaLabel } : card
        })

        return cards.length
          ? [
              {
                id: 'shared-titles',
                title: 'Shared Films & Shows',
                cards,
              },
            ]
          : []
      }

      const spotlightKeys = new Set(actorSpotlight?.titles.map((title) => title.id) ?? [])
      const remainingCards = sortedTitles
        .filter((title) => !spotlightKeys.has(getSharedTitleKey(title)))
        .map(mapSharedTitleToCard)

      return remainingCards.length
        ? [
            {
              id: 'remaining',
              title: 'Further Shared Credits',
              cards: remainingCards,
            },
          ]
        : []
    }

    const featuredActors = displayedComparisonState.result.sharedActors
      .filter((actor) => actor.roleCategory !== 'extra-both')
      .sort(compareFeaturedActorsForResults)
    const extraActors = displayedComparisonState.result.sharedActors
      .filter((actor) => actor.roleCategory === 'extra-both')
      .sort(compareExtraActorsForTitles)

    if (isMobileViewport) {
      const cards = [...featuredActors, ...extraActors].map(mapSharedActorToCard)

      return cards.length
        ? [
            {
              id: 'shared-cast',
              title: 'Shared Cast',
              cards,
            },
          ]
        : []
    }

    const spotlightActorKeys = new Set(titleSpotlight?.actors.map((actor) => actor.id) ?? [])
    const remainingFeaturedActors = featuredActors.filter((actor) => !spotlightActorKeys.has(`person-${actor.id}`))

    const groups: ResultCardGroup[] = []

    if (remainingFeaturedActors.length) {
      groups.push({
        id: 'shared-cast',
        title: titleSpotlight ? 'More Top-Billed Shared Cast' : 'Top-Billed Shared Cast',
        cards: remainingFeaturedActors.map(mapSharedActorToCard),
      })
    }

    if (extraActors.length) {
      groups.push({
        id: 'supporting-cast',
        title: 'Supporting Shared Cast',
        cards: extraActors.map(mapSharedActorToCard),
      })
    }

    return groups
  }, [actorSpotlight, displayedComparisonState, isMobileViewport, titleSpotlight])

  const resultCount = getComparisonResultCount(displayedComparisonState)
  const hasRenderableResultContent =
    mode === 'bacon'
      ? Boolean(baconResult)
      : Boolean(actorSpotlight || titleSpotlight || resultGroups.some((group) => group.cards.length > 0))
  const canShowDesktopBackToTop = !isMobileViewport && !isNativeApp() && hasRenderableResultContent
  const shouldShowFilterToggle = mode !== 'bacon' && resultCount > 0 && !showingHiddenExtras
  const shouldShowClearButton = mode !== 'bacon' && canClearSearchFields
  const shouldShowCopyResultsLink =
    !isLoading &&
    !errorMessage &&
    ((mode !== 'bacon' && activeSearchKey !== null && hasSearched) || (mode === 'bacon' && baconResult !== null))
  const copyResultsLinkLabel = isNativeApp()
    ? 'Share Results'
    : shareCopyState === 'copied'
      ? 'Copied'
      : shareCopyState === 'error'
        ? 'Unable to copy'
        : 'Copy Results Link'

  useEffect(() => {
    void configureNativeAppChrome().catch(() => undefined)
  }, [])
  const helperText =
    mode === 'actors'
      ? 'Find the titles connecting two performers.'
      : mode === 'titles'
        ? 'Find the shared cast of two titles.'
        : "Find a performer's path to Kevin Bacon."

  useEffect(() => {
    return () => {
      if (shareCopyResetTimeoutRef.current !== null) {
        window.clearTimeout(shareCopyResetTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return
    }

    const mediaQuery = window.matchMedia(MOBILE_LAYOUT_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches)
    }

    setIsMobileViewport(mediaQuery.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)
    return () => mediaQuery.removeListener(handleChange)
  }, [])

  useEffect(() => {
    setShareCopyState('idle')
  }, [activeSearchKey, isFilteringVisibleOnly, showingHiddenExtras, resultCount, baconResult])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const shareSnapshot = parseShareSnapshotFromHash(window.location.hash)
    if (!shareSnapshot) {
      return
    }

    const primaryShareSelection = shareSnapshot.primarySelection as SearchSelection | null
    const secondaryShareSelection = shareSnapshot.secondarySelection as SearchSelection | null

    searchRequestIdRef.current += 1
    lastCompletedSearchKeyRef.current =
      shareSnapshot.comparisonState || shareSnapshot.baconResult
        ? getActiveSearchKey(shareSnapshot.mode, primaryShareSelection, secondaryShareSelection)
        : null

    setMode(shareSnapshot.mode)
    setFilterExtras(shareSnapshot.filterExtras)
    setShowingHiddenExtras(shareSnapshot.showingHiddenExtras)
    setPrimarySelection(primaryShareSelection)
    setSecondarySelection(secondaryShareSelection)
    setPrimaryQuery(primaryShareSelection ? getSelectionLabel(primaryShareSelection) : '')
    setSecondaryQuery(secondaryShareSelection ? getSelectionLabel(secondaryShareSelection) : '')
    setComparisonState(shareSnapshot.comparisonState)
    setBaconResult(shareSnapshot.baconResult)
    setHasSearched(Boolean(shareSnapshot.comparisonState || shareSnapshot.baconResult))
    setIsLoading(false)
    setErrorMessage(null)
    if (shareSnapshot.comparisonState || shareSnapshot.baconResult) {
      setRevealedResultToken((token) => token + 1)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || isLoading || revealedResultToken === 0) {
      return
    }

    if (lastScrolledResultTokenRef.current === revealedResultToken) {
      return
    }

    const target = resultsScrollTargetRef.current
    if (!target) {
      return
    }

    lastScrolledResultTokenRef.current = revealedResultToken

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frameId = 0

    const animateScrollToY = (targetY: number) => {
      const startY = window.scrollY

      if (prefersReducedMotion || Math.abs(targetY - startY) < 8) {
        window.scrollTo({ top: targetY, behavior: 'auto' })
        return
      }

      const distance = targetY - startY
      const duration = Math.min(1100, Math.max(760, Math.abs(distance) * 0.65))
      const animationStart = window.performance.now()

      const step = (timestamp: number) => {
        const progress = Math.min(1, (timestamp - animationStart) / duration)
        const easedProgress = easeInOutCubic(progress)
        window.scrollTo({
          top: startY + distance * easedProgress,
          behavior: 'auto',
        })

        if (progress < 1) {
          frameId = window.requestAnimationFrame(step)
        }
      }

      frameId = window.requestAnimationFrame(step)
    }

    const startScroll = () => {
      const scrollMarginTop = Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0
      const startY = window.scrollY
      const targetY = Math.max(0, target.getBoundingClientRect().top + startY - scrollMarginTop)
      animateScrollToY(targetY)
    }

    frameId = window.requestAnimationFrame(startScroll)

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isLoading, revealedResultToken])

  useEffect(() => {
    if (typeof window === 'undefined' || !canShowDesktopBackToTop) {
      setShowBackToTopLink(false)
      return
    }

    const updateScrollability = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight > 24
      setShowBackToTopLink(scrollable)
    }

    updateScrollability()

    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateScrollability) : null
    resizeObserver?.observe(document.documentElement)
    window.addEventListener('resize', updateScrollability)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateScrollability)
    }
  }, [canShowDesktopBackToTop, revealedResultToken])

  const handleBackToTop = () => {
    if (typeof window === 'undefined') {
      return
    }

    const target = topScrollTargetRef.current
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const startY = window.scrollY
    const targetY = target
      ? Math.max(0, target.getBoundingClientRect().top + startY - 20)
      : 0

    if (prefersReducedMotion || Math.abs(targetY - startY) < 8) {
      window.scrollTo({ top: targetY, behavior: 'auto' })
      return
    }

    const distance = targetY - startY
    const duration = Math.min(1100, Math.max(760, Math.abs(distance) * 0.65))
    const animationStart = window.performance.now()

    const step = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - animationStart) / duration)
      const easedProgress = easeInOutCubic(progress)
      window.scrollTo({
        top: startY + distance * easedProgress,
        behavior: 'auto',
      })

      if (progress < 1) {
        window.requestAnimationFrame(step)
      }
    }

    window.requestAnimationFrame(step)
  }

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

  const copyTextToClipboard = async (value: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
      return
    }

    const textArea = document.createElement('textarea')
    textArea.value = value
    textArea.setAttribute('readonly', 'true')
    textArea.style.position = 'absolute'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.select()

    const didCopy = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (!didCopy) {
      throw new Error('Copy command failed')
    }
  }

  const handleCopyResultsLink = async () => {
    if (typeof window === 'undefined') {
      return
    }

    const shareUrl = createShareUrl(`${window.location.origin}${window.location.pathname}${window.location.search}`, {
      mode,
      filterExtras,
      showingHiddenExtras,
      primarySelection: primarySelection as ShareSelection,
      secondarySelection: secondarySelection as ShareSelection,
      comparisonState,
      baconResult,
    })

    try {
      if (
        await shareNativeLink({
          title: 'CastLink Results',
          text: 'Check out these CastLink results.',
          url: shareUrl,
        })
      ) {
        setShareCopyState('idle')
        return
      }

      await copyTextToClipboard(shareUrl)
      setShareCopyState('copied')
    } catch {
      setShareCopyState('error')
    }

    if (shareCopyResetTimeoutRef.current !== null) {
      window.clearTimeout(shareCopyResetTimeoutRef.current)
    }

    shareCopyResetTimeoutRef.current = window.setTimeout(() => {
      setShareCopyState('idle')
      shareCopyResetTimeoutRef.current = null
    }, 2000)
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
        setRevealedResultToken((token) => token + 1)
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
        setRevealedResultToken((token) => token + 1)
      }
    } catch (error) {
      if (searchRequestIdRef.current !== requestId) {
        return
      }
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create a random match.')
      lastCompletedSearchKeyRef.current = null
      setRevealedResultToken((token) => token + 1)
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
      setRevealedResultToken((token) => token + 1)
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
      setRevealedResultToken((token) => token + 1)
    }

    runSearch().catch((error) => {
      if (searchRequestIdRef.current !== requestId) {
        return
      }

      lastCompletedSearchKeyRef.current = null
      clearSearchResults()
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong while fetching TMDB data.')
      setIsLoading(false)
      setRevealedResultToken((token) => token + 1)
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

  const searchFields = (
    <div className={`search-row${mode === 'bacon' ? ' search-row-single search-row-bacon' : ''}`}>
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
  )

  const clearSelectionButton = (
    <button
      type="button"
      className={`clear-search-button clear-search-button-inline${
        mode !== 'bacon' && isMobileViewport ? ' clear-search-button-mobile-link' : ''
      }${shouldShowClearButton ? '' : ' clear-search-button-hidden'}`}
      onClick={shouldShowClearButton ? resetSelectionsAndResults : undefined}
      disabled={!canClearSearchFields || !shouldShowClearButton}
      aria-hidden={!shouldShowClearButton}
      tabIndex={shouldShowClearButton ? 0 : -1}
    >
      Clear Selection
    </button>
  )

  return (
    <div className="app-shell">
      <AppNav onAboutOpen={() => setAboutOpen(true)} onHowItWorksOpen={() => setHowItWorksOpen(true)} />

      <main className="app-main">
        <section className={`hero-stage hero-stage-${mode}`} ref={topScrollTargetRef}>
          <HeroHeader mode={mode} onModeChange={handleModeChange} />

        <section className={`search-panel search-panel-mode-${mode}`}>
          {mode !== 'bacon' ? (
            <>
              {!shouldShowClearButton ? (
                <div className="search-panel-toolbar search-panel-toolbar-helper">
                  <p className="search-panel-helper-text">{helperText}</p>
                </div>
              ) : null}

              <div
                className={`search-panel-primary search-panel-primary-dual search-panel-primary-with-clear search-panel-primary-mode-${mode}${
                  shouldShowClearButton ? '' : ' search-panel-primary-with-reserved-clear'
                }`}
              >
                {searchFields}
                <div
                  className={`search-panel-toolbar search-panel-toolbar-inline${
                    shouldShowClearButton ? '' : ' search-panel-toolbar-inline-reserved'
                  }`}
                >
                  {clearSelectionButton}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="search-panel-toolbar search-panel-toolbar-helper">
                <p className="search-panel-helper-text">{helperText}</p>
              </div>
              {searchFields}
            </>
          )}

            {mode !== 'bacon' && SHOW_RANDOM_MATCH ? (
              <div className="search-panel-actions">
                <button type="button" className="random-match-button" onClick={handleRandomMatch} disabled={isLoading}>
                  Random Match
                </button>
              </div>
            ) : null}

          </section>
        </section>

        {mode === 'bacon' ? (
          <div className="results-scroll-anchor" ref={resultsScrollTargetRef}>
            <BaconPathSection
              isLoading={isLoading}
              errorMessage={errorMessage}
              result={baconResult}
              showCopyResultsLink={shouldShowCopyResultsLink}
              copyResultsLinkLabel={copyResultsLinkLabel}
              onCopyResultsLink={handleCopyResultsLink}
              showBackToTopLink={showBackToTopLink}
              onBackToTop={handleBackToTop}
            />
          </div>
        ) : (
          <div className="results-scroll-anchor" ref={resultsScrollTargetRef}>
            <ResultsSection
              hasSearched={hasSearched}
              isLoading={isLoading}
              resultCount={resultCount}
              groups={resultGroups}
              sectionClassName={mode === 'titles' ? 'results-section-titles' : undefined}
              spotlight={
                mode === 'actors' && actorSpotlight ? (
                  <ActorConnectionSpotlight
                    leftActor={actorSpotlight.leftActor}
                    rightActor={actorSpotlight.rightActor}
                    titles={actorSpotlight.titles}
                  />
                ) : mode === 'titles' && titleSpotlight ? (
                  <TitleConnectionSpotlight
                    leftTitle={titleSpotlight.leftTitle}
                    rightTitle={titleSpotlight.rightTitle}
                    actors={titleSpotlight.actors}
                  />
                ) : undefined
              }
              emptyDescription={
                mode === 'actors'
                  ? 'Try searching for different actors to see shared titles.'
                  : 'Try searching for different titles to see overlapping cast.'
              }
              errorMessage={errorMessage}
              showingHiddenExtras={showingHiddenExtras}
              showFilterToggle={shouldShowFilterToggle}
              filterChecked={isFilteringVisibleOnly}
              onFilterChange={(checked) => {
                setFilterExtras(checked)
                setShowingHiddenExtras(false)
              }}
              showCopyResultsLink={shouldShowCopyResultsLink}
              copyResultsLinkLabel={copyResultsLinkLabel}
              onCopyResultsLink={handleCopyResultsLink}
              showBackToTopLink={showBackToTopLink}
              onBackToTop={handleBackToTop}
            />
          </div>
        )}
      </main>

      {!aboutOpen && !howItWorksOpen ? <TmdbFooter /> : null}

      <HowItWorksDialog open={howItWorksOpen} onClose={() => setHowItWorksOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  )
}

export default App
