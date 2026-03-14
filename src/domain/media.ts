export type MediaType = 'movie' | 'tv'

export interface MediaTitle {
  id: number
  mediaType: MediaType
  title: string
  originalTitle: string
  genreIds: number[]
  releaseDate?: string
  popularity: number
  voteCount: number
  posterPath?: string | null
}

export interface CastMember {
  id: number
  name: string
  character?: string
  order: number
  popularity: number
  profilePath?: string | null
}

export interface MediaWithCast {
  media: MediaTitle
  cast: CastMember[]
}

export interface PersonSummary {
  id: number
  name: string
  knownForDepartment?: string
  popularity: number
  profilePath?: string | null
}

export interface MediaCredit extends MediaTitle {
  character?: string
  order: number
}

export interface PersonWithCredits {
  person: PersonSummary
  credits: MediaCredit[]
}
