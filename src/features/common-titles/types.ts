import type { MediaType, PersonWithCredits } from '../../domain/media'

export interface SharedTitle {
  id: number
  mediaType: MediaType
  title: string
  releaseDate?: string
  posterPath?: string | null
  popularity: number
  voteCount: number
  leftCharacter?: string
  rightCharacter?: string
  leftOrder: number
  rightOrder: number
}

export interface CommonTitlesResult {
  left: PersonWithCredits
  right: PersonWithCredits
  sharedTitles: SharedTitle[]
}
