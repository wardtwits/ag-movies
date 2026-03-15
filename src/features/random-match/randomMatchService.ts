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
