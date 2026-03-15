import type { VisibilityMode } from '../../api/tmdbClient'
import { fetchCreditsForPerson, resolveActorToCredits } from '../../api/tmdbClient'
import type { MediaCredit, PersonSummary, PersonWithCredits } from '../../domain/media'
import { isExcludedTvGenre, isSelfCharacter } from '../../domain/mediaFilters'
import type { CommonTitlesResult, SharedTitle } from './types'

const sanitizeCharacter = (value?: string): string | undefined => value?.trim() || undefined

const combineCredit = (left: MediaCredit, right: MediaCredit): SharedTitle => ({
  id: left.id,
  mediaType: left.mediaType,
  title: left.title,
  genreIds: left.genreIds,
  releaseDate: left.releaseDate,
  posterPath: left.posterPath ?? right.posterPath,
  popularity: Math.max(left.popularity, right.popularity),
  voteCount: Math.max(left.voteCount, right.voteCount),
  leftCharacter: sanitizeCharacter(left.character),
  rightCharacter: sanitizeCharacter(right.character),
  leftOrder: left.order,
  rightOrder: right.order,
})

export const buildCommonTitlesResult = (left: PersonWithCredits, right: PersonWithCredits): CommonTitlesResult => {
  const leftByMediaKey = new Map<string, MediaCredit>(
    left.credits.map((credit) => [`${credit.mediaType}-${credit.id}`, credit]),
  )
  const sharedTitles = right.credits
    .filter((credit) => leftByMediaKey.has(`${credit.mediaType}-${credit.id}`))
    .map((credit) => combineCredit(leftByMediaKey.get(`${credit.mediaType}-${credit.id}`)!, credit))
    .sort((first, second) => {
      if (second.popularity !== first.popularity) {
        return second.popularity - first.popularity
      }
      if (second.voteCount !== first.voteCount) {
        return second.voteCount - first.voteCount
      }
      return first.title.localeCompare(second.title)
    })

  return {
    left,
    right,
    sharedTitles,
  }
}

export const filterCommonTitlesResult = (
  result: CommonTitlesResult,
  visibility: VisibilityMode,
): CommonTitlesResult => {
  if (visibility === 'all') {
    return result
  }

  return {
    ...result,
    sharedTitles: result.sharedTitles.filter(
      (title) =>
        !isExcludedTvGenre({ mediaType: title.mediaType, genreIds: title.genreIds }) &&
        !isSelfCharacter(title.leftCharacter) &&
        !isSelfCharacter(title.rightCharacter),
    ),
  }
}

export const findCommonTitlesFromPeople = async (
  leftPerson: PersonSummary,
  rightPerson: PersonSummary,
  visibility: VisibilityMode = 'visible-only',
): Promise<CommonTitlesResult> => {
  const [leftCredits, rightCredits] = await Promise.all([
    fetchCreditsForPerson(leftPerson.id, visibility),
    fetchCreditsForPerson(rightPerson.id, visibility),
  ])

  return buildCommonTitlesResult(
    { person: leftPerson, credits: leftCredits },
    { person: rightPerson, credits: rightCredits },
  )
}

export const findCommonTitles = async (leftActorQuery: string, rightActorQuery: string): Promise<CommonTitlesResult> => {
  const [left, right] = await Promise.all([resolveActorToCredits(leftActorQuery), resolveActorToCredits(rightActorQuery)])
  return buildCommonTitlesResult(left, right)
}
