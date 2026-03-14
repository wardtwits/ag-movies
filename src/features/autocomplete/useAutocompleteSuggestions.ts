import { useEffect, useRef, useState } from 'react'
import { searchMediaTitles, searchPeople } from '../../api/tmdbClient'
import type { MediaTitle, PersonSummary } from '../../domain/media'

export const AUTOCOMPLETE_MIN_QUERY_LENGTH = 3
const AUTOCOMPLETE_DEBOUNCE_MS = 300
const AUTOCOMPLETE_MAX_RESULTS = 7

const mediaSuggestionCache = new Map<string, MediaTitle[]>()
const personSuggestionCache = new Map<string, PersonSummary[]>()

const normalizeQuery = (query: string): string => query.trim().toLowerCase()

const loadCachedSuggestions = async <T>(
  cache: Map<string, T[]>,
  query: string,
  signal: AbortSignal,
  loader: (query: string, signal: AbortSignal) => Promise<T[]>,
): Promise<T[]> => {
  const cacheKey = normalizeQuery(query)
  const cached = cache.get(cacheKey)
  if (cached) {
    return cached
  }

  const results = (await loader(query, signal)).slice(0, AUTOCOMPLETE_MAX_RESULTS)
  if (!signal.aborted) {
    cache.set(cacheKey, results)
  }
  return results
}

export const fetchMediaSuggestions = (query: string, signal: AbortSignal): Promise<MediaTitle[]> =>
  loadCachedSuggestions(mediaSuggestionCache, query, signal, searchMediaTitles)

export const fetchPersonSuggestions = (query: string, signal: AbortSignal): Promise<PersonSummary[]> =>
  loadCachedSuggestions(personSuggestionCache, query, signal, searchPeople)

interface UseAutocompleteSuggestionsOptions<T> {
  enabled: boolean
  loader: (query: string, signal: AbortSignal) => Promise<T[]>
}

interface UseAutocompleteSuggestionsResult<T> {
  suggestions: T[]
  isLoading: boolean
  isEligible: boolean
  hasSearched: boolean
}

export const useAutocompleteSuggestions = <T>(
  query: string,
  { enabled, loader }: UseAutocompleteSuggestionsOptions<T>,
): UseAutocompleteSuggestionsResult<T> => {
  const [suggestions, setSuggestions] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const requestIdRef = useRef(0)

  const trimmedQuery = query.trim()
  const isEligible = enabled && trimmedQuery.length >= AUTOCOMPLETE_MIN_QUERY_LENGTH

  useEffect(() => {
    if (!isEligible) {
      setSuggestions([])
      setIsLoading(false)
      setHasSearched(false)
      return
    }

    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    const controller = new AbortController()
    const timerId = window.setTimeout(async () => {
      setIsLoading(true)
      try {
        const nextSuggestions = await loader(trimmedQuery, controller.signal)
        if (!controller.signal.aborted && requestIdRef.current === requestId) {
          setSuggestions(nextSuggestions)
          setHasSearched(true)
        }
      } catch (error) {
        if ((error as DOMException).name !== 'AbortError' && requestIdRef.current === requestId) {
          setSuggestions([])
          setHasSearched(true)
        }
      } finally {
        if (!controller.signal.aborted && requestIdRef.current === requestId) {
          setIsLoading(false)
        }
      }
    }, AUTOCOMPLETE_DEBOUNCE_MS)

    return () => {
      controller.abort()
      window.clearTimeout(timerId)
    }
  }, [isEligible, loader, trimmedQuery])

  return {
    suggestions,
    isLoading,
    isEligible,
    hasSearched,
  }
}
