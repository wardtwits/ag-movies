import type { MediaWithCast } from '../../domain/media'

export type SharedActorRoleCategory = 'star-both' | 'mixed' | 'extra-both'

export interface SharedActor {
  id: number
  name: string
  leftCharacter?: string
  rightCharacter?: string
  leftOrder: number
  rightOrder: number
  roleCategory: SharedActorRoleCategory
  popularity: number
  profilePath?: string | null
}

export interface CommonCastResult {
  left: MediaWithCast
  right: MediaWithCast
  sharedActors: SharedActor[]
}
