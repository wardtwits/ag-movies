import { fetchPopularPeople } from '../../api/tmdbClient'
import type { PersonSummary } from '../../domain/media'
import type { CommonCastResult } from '../common-cast/types'
import { findCommonCastFromMedia } from '../common-cast/commonCastService'
import type { CommonTitlesResult } from '../common-titles/types'
import { findCommonTitlesFromPeople } from '../common-titles/commonTitlesService'
import {
  RANDOM_ACTOR_PAIRS,
  RANDOM_TITLE_PAIRS,
  type RandomActorPair,
  type RandomTitlePair,
} from './catalog'

const shuffled = <T,>(items: readonly T[]): T[] => {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
  }
  return next
}

export interface RandomCommonCastMatch {
  selection: RandomTitlePair
  result: CommonCastResult
}

export interface RandomCommonTitlesMatch {
  selection: RandomActorPair
  result: CommonTitlesResult
}

const CURATED_RANDOM_BACON_ACTORS: PersonSummary[] = (() => {
  const actors = [...RANDOM_ACTOR_PAIRS.flatMap((pair) => [pair.left, pair.right])]
  const byId = new Map<number, PersonSummary>()
  actors.forEach((actor) => {
    if (!byId.has(actor.id)) {
      byId.set(actor.id, actor)
    }
  })
  return [...byId.values()]
})()

const popularPeopleCache = new Map<number, PersonSummary[]>()
const usedRandomBaconActorIds = new Set<number>()

const isKevinBacon = (person: PersonSummary): boolean => person.name.trim().toLowerCase() === 'kevin bacon'

const isEligibleRandomBaconActor = (person: PersonSummary, excludedActorId?: number): boolean => {
  if (excludedActorId !== undefined && person.id === excludedActorId) {
    return false
  }

  if (isKevinBacon(person)) {
    return false
  }

  return !person.knownForDepartment || person.knownForDepartment === 'Acting'
}

const pickRandomPerson = (people: PersonSummary[]): PersonSummary | null => {
  if (!people.length) {
    return null
  }

  const preferredPool = people.filter((person) => !usedRandomBaconActorIds.has(person.id))
  const source = preferredPool.length ? preferredPool : people
  const selection = source[Math.floor(Math.random() * source.length)]
  usedRandomBaconActorIds.add(selection.id)
  return selection
}

const getPopularPeoplePage = async (page: number): Promise<PersonSummary[]> => {
  const cached = popularPeopleCache.get(page)
  if (cached) {
    return cached
  }

  const results = await fetchPopularPeople(page)
  popularPeopleCache.set(page, results)
  return results
}

export const findRandomCommonCastMatch = async (): Promise<RandomCommonCastMatch> => {
  for (const selection of shuffled(RANDOM_TITLE_PAIRS)) {
    const result = await findCommonCastFromMedia(selection.left, selection.right, 'all')
    if (result.sharedActors.length > 0) {
      return { selection, result }
    }
  }

  throw new Error('No curated title pair produced shared cast results.')
}

export const findRandomCommonTitlesMatch = async (): Promise<RandomCommonTitlesMatch> => {
  for (const selection of shuffled(RANDOM_ACTOR_PAIRS)) {
    const result = await findCommonTitlesFromPeople(selection.left, selection.right, 'all')
    if (result.sharedTitles.length > 0) {
      return { selection, result }
    }
  }

  throw new Error('No curated actor pair produced shared title results.')
}

export const findRandomBaconActor = async (excludedActor?: PersonSummary | null): Promise<PersonSummary> => {
  const excludedActorId = excludedActor?.id

  const curatedSelection = pickRandomPerson(
    CURATED_RANDOM_BACON_ACTORS.filter((person) => isEligibleRandomBaconActor(person, excludedActorId)),
  )
  if (curatedSelection) {
    return curatedSelection
  }

  for (const page of [1, 2, 3]) {
    const popularActors = (await getPopularPeoplePage(page)).filter((person) =>
      isEligibleRandomBaconActor(person, excludedActorId),
    )

    const popularSelection = pickRandomPerson(popularActors)
    if (popularSelection) {
      return popularSelection
    }
  }

  throw new Error('Unable to find a random actor right now.')
}
