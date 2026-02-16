import type { CastMember, MediaTitle, MediaType, MediaWithCast } from '../domain/media'
import type {
  TmdbAggregateCastMember,
  TmdbAggregateCreditsResponse,
  TmdbCastMember,
  TmdbCreditsResponse,
  TmdbSearchResponse,
  TmdbSearchResult,
} from './tmdbTypes'

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3'

const normalizeText = (value: string): string => value.toLowerCase().replace(/[^a-z0-9]/g, '')

const readBearerToken = (): string => {
  const token = import.meta.env.VITE_TMDB_BEARER_TOKEN as string | undefined
  if (!token?.trim()) {
    throw new Error('Missing VITE_TMDB_BEARER_TOKEN. Add it to .env.local before searching.')
  }
  return token
}

const isMediaType = (value: string): value is MediaType => value === 'movie' || value === 'tv'

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
  return Array.from(byId.values())
}

const requestTmdb = async <T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
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

const pickBestMatch = (query: string, results: MediaTitle[]): MediaTitle => {
  return [...results].sort((left, right) => scoreMatch(right, query) - scoreMatch(left, query))[0]
}

export const searchMediaTitles = async (query: string): Promise<MediaTitle[]> => {
  const response = await requestTmdb<TmdbSearchResponse>('/search/multi', {
    query,
    language: 'en-US',
    include_adult: false,
    page: 1,
  })

  return response.results
    .map(mapSearchResultToMediaTitle)
    .filter((candidate): candidate is MediaTitle => candidate !== null)
}

export const fetchCastForMedia = async (media: MediaTitle): Promise<CastMember[]> => {
  if (media.mediaType === 'tv') {
    try {
      const aggregateResponse = await requestTmdb<TmdbAggregateCreditsResponse>(
        `/tv/${media.id}/aggregate_credits`,
        {
          language: 'en-US',
        },
      )

      return dedupeCastMembers(aggregateResponse.cast.map(mapAggregateCastMember)).sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order
        }
        return right.popularity - left.popularity
      })
    } catch {
      const fallbackResponse = await requestTmdb<TmdbCreditsResponse>(`/tv/${media.id}/credits`, {
        language: 'en-US',
      })

      return dedupeCastMembers(fallbackResponse.cast.map(mapCastMember)).sort((left, right) => {
        if (left.order !== right.order) {
          return left.order - right.order
        }
        return right.popularity - left.popularity
      })
    }
  }

  const movieCreditsResponse = await requestTmdb<TmdbCreditsResponse>(`/movie/${media.id}/credits`, {
    language: 'en-US',
  })

  return dedupeCastMembers(movieCreditsResponse.cast.map(mapCastMember)).sort((left, right) => {
    if (left.order !== right.order) {
      return left.order - right.order
    }
    return right.popularity - left.popularity
  })
}

export const resolveTitleToCast = async (query: string): Promise<MediaWithCast> => {
  const cleanQuery = query.trim()
  if (!cleanQuery) {
    throw new Error('Please enter a movie or TV title.')
  }

  const matches = await searchMediaTitles(cleanQuery)
  if (!matches.length) {
    throw new Error(`No movie or TV title was found for "${cleanQuery}".`)
  }

  const selectedMedia = pickBestMatch(cleanQuery, matches)
  const cast = await fetchCastForMedia(selectedMedia)

  return {
    media: selectedMedia,
    cast,
  }
}
