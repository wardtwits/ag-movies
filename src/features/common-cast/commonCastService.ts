import type { VisibilityMode } from '../../api/tmdbClient'
import { fetchCastForMedia, resolveTitleToCast } from '../../api/tmdbClient'
import type { CastMember, MediaTitle, MediaWithCast } from '../../domain/media'
import { isSelfCharacter } from '../../domain/mediaFilters'
import type { CommonCastResult, SharedActor } from './types'

const sanitizeCharacter = (value?: string): string | undefined => value?.trim() || undefined
const STAR_BILLING_ORDER_THRESHOLD = 8

const isStarBilling = (order: number): boolean => order <= STAR_BILLING_ORDER_THRESHOLD

const resolveRoleCategory = (leftOrder: number, rightOrder: number): SharedActor['roleCategory'] => {
  const leftIsStar = isStarBilling(leftOrder)
  const rightIsStar = isStarBilling(rightOrder)

  if (leftIsStar && rightIsStar) {
    return 'star-both'
  }
  if (leftIsStar !== rightIsStar) {
    return 'mixed'
  }
  return 'extra-both'
}

const combineMember = (left: CastMember, right: CastMember): SharedActor => {
  const leftOrder = left.order
  const rightOrder = right.order

  return {
    id: left.id,
    name: left.name,
    leftCharacter: sanitizeCharacter(left.character),
    rightCharacter: sanitizeCharacter(right.character),
    leftOrder,
    rightOrder,
    roleCategory: resolveRoleCategory(leftOrder, rightOrder),
    popularity: left.popularity + right.popularity,
    profilePath: left.profilePath ?? right.profilePath,
  }
}

export const buildCommonCastResult = (left: MediaWithCast, right: MediaWithCast): CommonCastResult => {
  const leftById = new Map<number, CastMember>(left.cast.map((member) => [member.id, member]))
  const sharedActors = right.cast
    .filter((member) => leftById.has(member.id))
    .map((member) => combineMember(leftById.get(member.id)!, member))
    .sort((first, second) => {
      if (second.popularity !== first.popularity) {
        return second.popularity - first.popularity
      }
      return first.name.localeCompare(second.name)
    })

  return {
    left,
    right,
    sharedActors,
  }
}

export const filterCommonCastResult = (
  result: CommonCastResult,
  visibility: VisibilityMode,
): CommonCastResult => {
  if (visibility === 'all') {
    return result
  }

  return {
    ...result,
    sharedActors: result.sharedActors.filter(
      (actor) => !isSelfCharacter(actor.leftCharacter) && !isSelfCharacter(actor.rightCharacter),
    ),
  }
}

export const findCommonCastFromMedia = async (
  leftMedia: MediaTitle,
  rightMedia: MediaTitle,
  visibility: VisibilityMode = 'visible-only',
): Promise<CommonCastResult> => {
  const [leftCast, rightCast] = await Promise.all([
    fetchCastForMedia(leftMedia, visibility),
    fetchCastForMedia(rightMedia, visibility),
  ])

  return buildCommonCastResult(
    { media: leftMedia, cast: leftCast },
    { media: rightMedia, cast: rightCast },
  )
}

export const findCommonCast = async (leftQuery: string, rightQuery: string): Promise<CommonCastResult> => {
  const [left, right] = await Promise.all([resolveTitleToCast(leftQuery), resolveTitleToCast(rightQuery)])
  return buildCommonCastResult(left, right)
}
