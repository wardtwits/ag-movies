import { fetchCreditsForPerson, resolveActorToCredits } from '../../api/tmdbClient'
import type { MediaCredit, PersonSummary, PersonWithCredits } from '../../domain/media'
import type { CommonTitlesResult, SharedTitle } from './types'

const sanitizeCharacter = (value?: string): string | undefined => value?.trim() || undefined

const combineCredit = (left: MediaCredit, right: MediaCredit): SharedTitle => ({
  id: left.id,
  mediaType: left.mediaType,
  title: left.title,
  releaseDate: left.releaseDate,
  popularity: Math.max(left.popularity, right.popularity),
  voteCount: Math.max(left.voteCount, right.voteCount),
  leftCharacter: sanitizeCharacter(left.character),
  rightCharacter: sanitizeCharacter(right.character),
  leftOrder: left.order,
  rightOrder: right.order,
})

const buildCommonTitlesResult = (left: PersonWithCredits, right: PersonWithCredits): CommonTitlesResult => {
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

export const findCommonTitlesFromPeople = async (
  leftPerson: PersonSummary,
  rightPerson: PersonSummary,
): Promise<CommonTitlesResult> => {
  const [leftCredits, rightCredits] = await Promise.all([
    fetchCreditsForPerson(leftPerson.id),
    fetchCreditsForPerson(rightPerson.id),
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
