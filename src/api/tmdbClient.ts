import type {
  CastMember,
  MediaCredit,
  MediaTitle,
  MediaType,
  MediaWithCast,
  PersonSummary,
  PersonWithCredits,
} from '../domain/media'
import {
  isEligibleBaconPerson,
  isVisibleCastMember,
  isVisibleMediaCredit,
  isVisibleMediaTitle,
} from '../domain/mediaFilters'
import type {
  TmdbAggregateCastMember,
  TmdbAggregateCreditsResponse,
  TmdbCastMember,
  TmdbCreditsResponse,
  TmdbPersonCombinedCreditsResponse,
  TmdbPersonCredit,
  TmdbPersonDetailsResponse,
  TmdbPersonSearchResponse,
  TmdbPersonSearchResult,
  TmdbSearchResponse,
  TmdbSearchResult,
} from './tmdbTypes'

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'

export type VisibilityMode = 'visible-only' | 'all'

const normalizeText = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const readBearerToken = (): string => {
  const token = import.meta.env.VITE_TMDB_BEARER_TOKEN as string | undefined
  if (!token?.trim()) {
    throw new Error('Missing VITE_TMDB_BEARER_TOKEN. Add it to .env.local before searching.')
  }
  return token
}

const isMediaType = (value: string): value is MediaType => value === 'movie' || value === 'tv'

const applyVisibilityFilter = <T>(
  items: T[],
  visibility: VisibilityMode,
  predicate: (item: T) => boolean,
): T[] => (visibility === 'all' ? items : items.filter(predicate))

const mapSearchResultToMediaTitle = (result: TmdbSearchResult): MediaTitle | null => {
  if (!isMediaType(result.media_type)) {
    return null
  }

  const title = result.media_type === 'movie' ? result.title : result.name
  if (!title) {
    return null
  }

  return {
    id: result.id,
    mediaType: result.media_type,
    title,
    originalTitle:
      result.media_type === 'movie'
        ? (result.original_title ?? title)
        : (result.original_name ?? title),
    genreIds: result.genre_ids ?? [],
    releaseDate: result.media_type === 'movie' ? result.release_date : result.first_air_date,
    popularity: result.popularity ?? 0,
    voteCount: result.vote_count ?? 0,
    posterPath: result.poster_path,
  }
}

const mapCastMember = (member: TmdbCastMember): CastMember => ({
  id: member.id,
  name: member.name,
  character: member.character?.trim() || undefined,
  order: member.order ?? Number.MAX_SAFE_INTEGER,
  popularity: member.popularity ?? 0,
  profilePath: member.profile_path,
})

const mapPersonSearchResult = (result: TmdbPersonSearchResult): PersonSummary => ({
  id: result.id,
  name: result.name,
  knownForDepartment: result.known_for_department?.trim() || undefined,
  popularity: result.popularity ?? 0,
  profilePath: result.profile_path,
})

const mapPersonDetailsToSummary = (result: TmdbPersonDetailsResponse): PersonSummary => ({
  id: result.id,
  name: result.name,
  knownForDepartment: result.known_for_department?.trim() || undefined,
  popularity: result.popularity ?? 0,
  profilePath: result.profile_path,
})

const mapPersonCreditToMedia = (credit: TmdbPersonCredit): MediaCredit | null => {
  if (!isMediaType(credit.media_type)) {
    return null
  }

  const title = credit.media_type === 'movie' ? credit.title : credit.name
  if (!title) {
    return null
  }

  return {
    id: credit.id,
    mediaType: credit.media_type,
    title,
    originalTitle:
      credit.media_type === 'movie'
        ? (credit.original_title ?? title)
        : (credit.original_name ?? title),
    genreIds: credit.genre_ids ?? [],
    releaseDate: credit.media_type === 'movie' ? credit.release_date : credit.first_air_date,
    popularity: credit.popularity ?? 0,
    voteCount: credit.vote_count ?? 0,
    posterPath: credit.poster_path,
    character: credit.character?.trim() || undefined,
    order: credit.order ?? Number.MAX_SAFE_INTEGER,
  }
}

const mapAggregateCastMember = (member: TmdbAggregateCastMember): CastMember => {
  const strongestRole = [...(member.roles ?? [])].sort(
    (left, right) => (right.episode_count ?? 0) - (left.episode_count ?? 0),
  )[0]

  return {
    id: member.id,
    name: member.name,
    character: strongestRole?.character?.trim() || undefined,
    order: member.order ?? Number.MAX_SAFE_INTEGER,
    popularity: member.popularity ?? 0,
    profilePath: member.profile_path,
  }
}

const dedupeCastMembers = (members: CastMember[]): CastMember[] => {
  const byId = new Map<number, CastMember>()
  for (const member of members) {
    if (!byId.has(member.id)) {
      byId.set(member.id, member)
    }
  }
  return [...byId.values()]
}

const dedupeMediaCredits = (credits: MediaCredit[]): MediaCredit[] => {
  const byMediaKey = new Map<string, MediaCredit>()
  for (const credit of credits) {
    const key = `${credit.mediaType}-${credit.id}`
    const existing = byMediaKey.get(key)
    if (!existing) {
      byMediaKey.set(key, credit)
      continue
    }

    const shouldReplace =
      credit.order < existing.order ||
      (credit.order === existing.order && credit.popularity > existing.popularity)
    if (shouldReplace) {
      byMediaKey.set(key, credit)
    }
  }

  return [...byMediaKey.values()]
}

const requestTmdb = async <T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  signal?: AbortSignal,
): Promise<T> => {
  const url = new URL(`${TMDB_API_BASE_URL}${path}`)
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value))
      }
    }
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${readBearerToken()}`,
      Accept: 'application/json',
    },
    signal,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`TMDB request failed (${response.status}): ${errorBody || response.statusText}`)
  }

  return (await response.json()) as T
}

const scoreMatch = (media: MediaTitle, rawQuery: string): number => {
  const query = normalizeText(rawQuery)
  const title = normalizeText(media.title)

  let score = Math.log1p(media.popularity) + Math.log1p(media.voteCount)
  if (title === query) {
    score += 100
  } else if (title.startsWith(query)) {
    score += 35
  } else if (title.includes(query)) {
    score += 18
  }

  return score
}

const scorePersonMatch = (person: PersonSummary, rawQuery: string): number => {
  const query = normalizeText(rawQuery)
  const name = normalizeText(person.name)

  let score = Math.log1p(person.popularity)
  if (name === query) {
    score += 100
  } else if (name.startsWith(query)) {
    score += 35
  } else if (name.includes(query)) {
    score += 18
  }

  return score
}

const pickBestMatch = (query: string, results: MediaTitle[]): MediaTitle => {
  return [...results].sort((left, right) => scoreMatch(right, query) - scoreMatch(left, query))[0]
}

const pickBestPersonMatch = (query: string, results: PersonSummary[]): PersonSummary => {
  return [...results].sort((left, right) => scorePersonMatch(right, query) - scorePersonMatch(left, query))[0]
}

export const searchMediaTitles = async (
  query: string,
  signal?: AbortSignal,
  visibility: VisibilityMode = 'all',
): Promise<MediaTitle[]> => {
  const response = await requestTmdb<TmdbSearchResponse>(
    '/search/multi',
    {
      query,
      language: 'en-US',
      include_adult: false,
      page: 1,
    },
    signal,
  )

  return applyVisibilityFilter(
    response.results
      .map(mapSearchResultToMediaTitle)
      .filter((candidate): candidate is MediaTitle => candidate !== null)
      .sort((left, right) => scoreMatch(right, query) - scoreMatch(left, query)),
    visibility,
    isVisibleMediaTitle,
  )
}

export const searchPeople = async (query: string, signal?: AbortSignal): Promise<PersonSummary[]> => {
  const response = await requestTmdb<TmdbPersonSearchResponse>(
    '/search/person',
    {
      query,
      language: 'en-US',
      include_adult: false,
      page: 1,
    },
    signal,
  )

  return response.results
    .map(mapPersonSearchResult)
    .sort((left, right) => scorePersonMatch(right, query) - scorePersonMatch(left, query))
}

export const searchActors = async (query: string, signal?: AbortSignal): Promise<PersonSummary[]> => {
  const people = await searchPeople(query, signal)
  return people.filter(isEligibleBaconPerson)
}

export const fetchPopularPeople = async (page = 1): Promise<PersonSummary[]> => {
  const response = await requestTmdb<TmdbPersonSearchResponse>('/person/popular', {
    language: 'en-US',
    page,
  })

  return response.results
    .map(mapPersonSearchResult)
    .sort((left, right) => right.popularity - left.popularity)
}

export const fetchPersonSummaryById = async (id: number): Promise<PersonSummary> => {
  const response = await requestTmdb<TmdbPersonDetailsResponse>(`/person/${id}`, {
    language: 'en-US',
  })

  return mapPersonDetailsToSummary(response)
}

export const resolveTitle = async (query: string, visibility: VisibilityMode = 'all'): Promise<MediaTitle> => {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    throw new Error('Please enter a movie or TV title.')
  }

  const matches = await searchMediaTitles(cleanQuery, undefined, visibility)
  if (!matches.length) {
    throw new Error(`No movie or TV title was found for "${cleanQuery}".`)
  }

  return pickBestMatch(cleanQuery, matches)
}

export const resolveActor = async (query: string): Promise<PersonSummary> => {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    throw new Error('Please enter an actor name.')
  }

  const matches = await searchPeople(cleanQuery)
  if (!matches.length) {
    throw new Error(`No actor was found for "${cleanQuery}".`)
  }

  return pickBestPersonMatch(cleanQuery, matches)
}

export const resolveBaconActor = async (query: string): Promise<PersonSummary> => {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    throw new Error('Please enter an actor name.')
  }

  const matches = await searchActors(cleanQuery)
  if (!matches.length) {
    throw new Error(`No credited actor was found for "${cleanQuery}".`)
  }

  return pickBestPersonMatch(cleanQuery, matches)
}

const sortCastMembers = (members: CastMember[]): CastMember[] => {
  return [...members].sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order
    }
    return right.popularity - left.popularity
  })
}

export const fetchCastForMedia = async (
  media: MediaTitle,
  visibility: VisibilityMode = 'visible-only',
): Promise<CastMember[]> => {
  if (media.mediaType === 'tv') {
    try {
      const aggregateResponse = await requestTmdb<TmdbAggregateCreditsResponse>(
        `/tv/${media.id}/aggregate_credits`,
        {
          language: 'en-US',
        },
      )

      return sortCastMembers(
        applyVisibilityFilter(
          dedupeCastMembers(aggregateResponse.cast.map(mapAggregateCastMember)),
          visibility,
          isVisibleCastMember,
        ),
      )
    } catch {
      const fallbackResponse = await requestTmdb<TmdbCreditsResponse>(`/tv/${media.id}/credits`, {
        language: 'en-US',
      })

      return sortCastMembers(
        applyVisibilityFilter(
          dedupeCastMembers(fallbackResponse.cast.map(mapCastMember)),
          visibility,
          isVisibleCastMember,
        ),
      )
    }
  }

  const movieCreditsResponse = await requestTmdb<TmdbCreditsResponse>(`/movie/${media.id}/credits`, {
    language: 'en-US',
  })

  return sortCastMembers(
    applyVisibilityFilter(dedupeCastMembers(movieCreditsResponse.cast.map(mapCastMember)), visibility, isVisibleCastMember),
  )
}

export const fetchCreditsForPerson = async (
  personId: number,
  visibility: VisibilityMode = 'visible-only',
): Promise<MediaCredit[]> => {
  const response = await requestTmdb<TmdbPersonCombinedCreditsResponse>(`/person/${personId}/combined_credits`, {
    language: 'en-US',
  })

  return dedupeMediaCredits(
    applyVisibilityFilter(
      response.cast
        .map(mapPersonCreditToMedia)
        .filter((candidate): candidate is MediaCredit => candidate !== null),
      visibility,
      isVisibleMediaCredit,
    ),
  ).sort((left, right) => {
    if (right.popularity !== left.popularity) {
      return right.popularity - left.popularity
    }
    if (right.voteCount !== left.voteCount) {
      return right.voteCount - left.voteCount
    }
    return left.title.localeCompare(right.title)
  })
}

const ACTOR_AUTOCOMPLETE_MIN_VISIBLE_CREDITS = 3
const ACTOR_AUTOCOMPLETE_CANDIDATE_LIMIT = 12
const actorAutocompleteCreditCountCache = new Map<number, Promise<number>>()

const fetchVisibleCreditCountForPerson = (personId: number): Promise<number> => {
  const cached = actorAutocompleteCreditCountCache.get(personId)
  if (cached) {
    return cached
  }

  const request = fetchCreditsForPerson(personId)
    .then((credits) => credits.length)
    .catch(() => 0)

  actorAutocompleteCreditCountCache.set(personId, request)
  return request
}

export const searchAutocompleteActors = async (
  query: string,
  signal?: AbortSignal,
): Promise<PersonSummary[]> => {
  const candidates = (await searchPeople(query, signal))
    .filter(isEligibleBaconPerson)
    .filter((person) => Boolean(person.profilePath))
    .slice(0, ACTOR_AUTOCOMPLETE_CANDIDATE_LIMIT)

  if (signal?.aborted) {
    throw new DOMException('Autocomplete request aborted.', 'AbortError')
  }

  const creditCounts = await Promise.all(
    candidates.map(async (person) => ({
      person,
      creditCount: await fetchVisibleCreditCountForPerson(person.id),
    })),
  )

  if (signal?.aborted) {
    throw new DOMException('Autocomplete request aborted.', 'AbortError')
  }

  return creditCounts
    .filter(({ creditCount }) => creditCount >= ACTOR_AUTOCOMPLETE_MIN_VISIBLE_CREDITS)
    .map(({ person }) => person)
}

export const resolveTitleToCast = async (
  query: string,
  visibility: VisibilityMode = 'visible-only',
): Promise<MediaWithCast> => {
  const selectedMedia = await resolveTitle(query, visibility)
  const cast = await fetchCastForMedia(selectedMedia, visibility)

  return {
    media: selectedMedia,
    cast,
  }
}

export const resolveActorToCredits = async (
  query: string,
  visibility: VisibilityMode = 'visible-only',
): Promise<PersonWithCredits> => {
  const selectedActor = await resolveActor(query)
  const credits = await fetchCreditsForPerson(selectedActor.id, visibility)

  return {
    person: selectedActor,
    credits,
  }
}
