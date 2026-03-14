export interface TmdbSearchResponse {
  results: TmdbSearchResult[]
}

export interface TmdbPersonSearchResponse {
  results: TmdbPersonSearchResult[]
}

export interface TmdbSearchResult {
  id: number
  media_type: string
  genre_ids?: number[]
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  release_date?: string
  first_air_date?: string
  popularity?: number
  vote_count?: number
  poster_path?: string | null
}

export interface TmdbPersonSearchResult {
  id: number
  name: string
  popularity?: number
  profile_path?: string | null
}

export interface TmdbCreditsResponse {
  cast: TmdbCastMember[]
}

export interface TmdbPersonCombinedCreditsResponse {
  cast: TmdbPersonCredit[]
}

export interface TmdbAggregateCreditsResponse {
  cast: TmdbAggregateCastMember[]
}

export interface TmdbCastMember {
  id: number
  name: string
  character?: string
  order?: number
  popularity?: number
  profile_path?: string | null
}

export interface TmdbAggregateCastMember {
  id: number
  name: string
  order?: number
  popularity?: number
  profile_path?: string | null
  total_episode_count?: number
  roles?: Array<{
    character?: string
    episode_count?: number
  }>
}

export interface TmdbPersonCredit {
  id: number
  media_type: string
  genre_ids?: number[]
  title?: string
  name?: string
  original_title?: string
  original_name?: string
  release_date?: string
  first_air_date?: string
  popularity?: number
  vote_count?: number
  poster_path?: string | null
  character?: string
  order?: number
}
