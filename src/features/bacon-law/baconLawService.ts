import {
  fetchCastForMedia,
  fetchCreditsForPerson,
  fetchPersonSummaryById,
  resolveActor,
  resolveActorToCredits,
} from '../../api/tmdbClient'
import type { CastMember, MediaCredit, PersonSummary, PersonWithCredits } from '../../domain/media'
import type { BaconConnectionStep, BaconLawResult } from './types'

const KEVIN_BACON_QUERY = 'Kevin Bacon'
const MAX_DEGREES = 6
const MAX_FRONTIER_WIDTH = 8
const MAX_ACTOR_EXPANSIONS = 18
const MAX_CREDITS_PER_ACTOR = 8
const MAX_CAST_PER_TITLE = 10

interface VisitedActorEntry {
  actor: PersonSummary
  parentActorId: number | null
  viaMedia: MediaCredit | null
  fromCharacter?: string
  toCharacter?: string
}

interface FrontierExpansionResult {
  nextFrontier: PersonSummary[]
  meetingActorId: number | null
  expandedActorCount: number
}

const personCreditsCache = new Map<number, Promise<PersonWithCredits>>()
const mediaCastCache = new Map<string, Promise<CastMember[]>>()
let kevinBaconPromise: Promise<PersonWithCredits> | null = null

const sanitizeCharacter = (value?: string): string | undefined => value?.trim() || undefined

const getOrSetCachedPromise = <K extends string | number, T>(
  cache: Map<K, Promise<T>>,
  key: K,
  loader: () => Promise<T>,
): Promise<T> => {
  const existing = cache.get(key)
  if (existing) {
    return existing
  }

  const pending = loader().catch((error) => {
    cache.delete(key)
    throw error
  })
  cache.set(key, pending)
  return pending
}

const toPersonSummary = (member: CastMember): PersonSummary => ({
  id: member.id,
  name: member.name,
  popularity: member.popularity,
  profilePath: member.profilePath,
})

const mediaKey = (credit: MediaCredit): string => `${credit.mediaType}-${credit.id}`

const filterBaconCredits = (credits: MediaCredit[]): MediaCredit[] => credits.filter((credit) => credit.mediaType === 'movie')

const scoreCredit = (credit: MediaCredit): number => {
  const orderScore = Math.max(0, 24 - Math.min(credit.order, 24))
  return orderScore * 2.2 + Math.log1p(credit.popularity) * 4.5 + Math.log1p(credit.voteCount)
}

const selectCreditsForExpansion = (credits: MediaCredit[]): MediaCredit[] =>
  [...credits].sort((left, right) => scoreCredit(right) - scoreCredit(left)).slice(0, MAX_CREDITS_PER_ACTOR)

const selectCastForExpansion = (
  cast: CastMember[],
  currentActorId: number,
  priorityActorIds: ReadonlySet<number>,
): CastMember[] => {
  const filtered = cast.filter((member) => member.id !== currentActorId)
  const selected = filtered.slice(0, MAX_CAST_PER_TITLE)
  const selectedIds = new Set(selected.map((member) => member.id))

  for (const member of filtered) {
    if (priorityActorIds.has(member.id) && !selectedIds.has(member.id)) {
      selected.push(member)
      selectedIds.add(member.id)
    }
  }

  return selected
}

const loadPersonWithCredits = async (person: PersonSummary): Promise<PersonWithCredits> =>
  getOrSetCachedPromise(personCreditsCache, person.id, async () => {
    const [credits, enrichedPerson] = await Promise.all([
      fetchCreditsForPerson(person.id),
      person.profilePath ? Promise.resolve(person) : fetchPersonSummaryById(person.id).catch(() => person),
    ])

    return {
      person: enrichedPerson,
      credits: filterBaconCredits(credits),
    }
  })

const loadKevinBacon = async (): Promise<PersonWithCredits> => {
  if (!kevinBaconPromise) {
    kevinBaconPromise = resolveActorToCredits(KEVIN_BACON_QUERY)
      .then((kevinBacon) => ({
        person: kevinBacon.person,
        credits: filterBaconCredits(kevinBacon.credits),
      }))
      .catch((error) => {
        kevinBaconPromise = null
        throw error
      })
  }

  return kevinBaconPromise
}

const loadCastForCredit = async (credit: MediaCredit): Promise<CastMember[]> =>
  getOrSetCachedPromise(mediaCastCache, mediaKey(credit), () => fetchCastForMedia(credit))

const expandFrontier = async (
  frontier: PersonSummary[],
  ownVisited: Map<number, VisitedActorEntry>,
  otherVisited: Map<number, VisitedActorEntry>,
): Promise<FrontierExpansionResult> => {
  const actorsToExpand = [...frontier]
    .sort((left, right) => right.popularity - left.popularity)
    .slice(0, MAX_FRONTIER_WIDTH)
  const nextFrontier = new Map<number, PersonSummary>()
  const priorityActorIds = new Set(otherVisited.keys())

  for (const actor of actorsToExpand) {
    const fullActor = await loadPersonWithCredits(actor)
    const candidateCredits = selectCreditsForExpansion(fullActor.credits)

    for (const credit of candidateCredits) {
      const cast = await loadCastForCredit(credit)
      const castCandidates = selectCastForExpansion(cast, actor.id, priorityActorIds)

      for (const member of castCandidates) {
        if (ownVisited.has(member.id)) {
          continue
        }

        const nextActor = toPersonSummary(member)
        ownVisited.set(member.id, {
          actor: nextActor,
          parentActorId: actor.id,
          viaMedia: credit,
          fromCharacter: sanitizeCharacter(credit.character),
          toCharacter: sanitizeCharacter(member.character),
        })

        if (otherVisited.has(member.id)) {
          return {
            nextFrontier: [],
            meetingActorId: member.id,
            expandedActorCount: actorsToExpand.length,
          }
        }

        nextFrontier.set(member.id, nextActor)
      }
    }
  }

  return {
    nextFrontier: [...nextFrontier.values()]
      .sort((left, right) => right.popularity - left.popularity)
      .slice(0, MAX_FRONTIER_WIDTH),
    meetingActorId: null,
    expandedActorCount: actorsToExpand.length,
  }
}

const buildPathFromSource = (
  sourceVisited: Map<number, VisitedActorEntry>,
  meetingActorId: number,
): BaconConnectionStep[] => {
  const reversedSteps: BaconConnectionStep[] = []
  let currentActorId = meetingActorId

  while (true) {
    const currentEntry = sourceVisited.get(currentActorId)
    if (!currentEntry || currentEntry.parentActorId === null || currentEntry.viaMedia === null) {
      break
    }

    const parentEntry = sourceVisited.get(currentEntry.parentActorId)
    if (!parentEntry) {
      break
    }

    reversedSteps.push({
      fromActor: parentEntry.actor,
      toActor: currentEntry.actor,
      media: currentEntry.viaMedia,
      fromCharacter: currentEntry.fromCharacter,
      toCharacter: currentEntry.toCharacter,
    })

    currentActorId = currentEntry.parentActorId
  }

  return reversedSteps.reverse()
}

const buildPathToTarget = (
  targetVisited: Map<number, VisitedActorEntry>,
  meetingActorId: number,
): BaconConnectionStep[] => {
  const steps: BaconConnectionStep[] = []
  let currentActorId = meetingActorId

  while (true) {
    const currentEntry = targetVisited.get(currentActorId)
    if (!currentEntry || currentEntry.parentActorId === null || currentEntry.viaMedia === null) {
      break
    }

    const parentEntry = targetVisited.get(currentEntry.parentActorId)
    if (!parentEntry) {
      break
    }

    steps.push({
      fromActor: currentEntry.actor,
      toActor: parentEntry.actor,
      media: currentEntry.viaMedia,
      fromCharacter: currentEntry.toCharacter,
      toCharacter: currentEntry.fromCharacter,
    })

    currentActorId = currentEntry.parentActorId
  }

  return steps
}

const buildResult = (
  actor: PersonWithCredits,
  kevinBacon: PersonWithCredits,
  sourceVisited: Map<number, VisitedActorEntry>,
  targetVisited: Map<number, VisitedActorEntry>,
  meetingActorId: number,
): BaconLawResult => {
  const steps = [...buildPathFromSource(sourceVisited, meetingActorId), ...buildPathToTarget(targetVisited, meetingActorId)]

  return {
    actor,
    kevinBacon,
    degree: steps.length,
    steps,
  }
}

const findDirectConnection = (
  actor: PersonWithCredits,
  kevinBacon: PersonWithCredits,
): BaconLawResult | null => {
  const kevinCreditByKey = new Map<string, MediaCredit>()

  for (const credit of kevinBacon.credits) {
    kevinCreditByKey.set(mediaKey(credit), credit)
  }

  const sharedCredits = actor.credits
    .map((credit) => {
      const kevinCredit = kevinCreditByKey.get(mediaKey(credit))
      if (!kevinCredit) {
        return null
      }

      return {
        actorCredit: credit,
        kevinCredit,
        score: scoreCredit(credit) + scoreCredit(kevinCredit),
      }
    })
    .filter(
      (
        candidate,
      ): candidate is {
        actorCredit: MediaCredit
        kevinCredit: MediaCredit
        score: number
      } => candidate !== null,
    )
    .sort((left, right) => right.score - left.score)

  if (!sharedCredits.length) {
    return null
  }

  const strongestSharedCredit = sharedCredits[0]

  return {
    actor,
    kevinBacon,
    degree: 1,
    steps: [
      {
        fromActor: actor.person,
        toActor: kevinBacon.person,
        media: strongestSharedCredit.actorCredit,
        fromCharacter: sanitizeCharacter(strongestSharedCredit.actorCredit.character),
        toCharacter: sanitizeCharacter(strongestSharedCredit.kevinCredit.character),
      },
    ],
  }
}

export const findBaconConnectionFromPerson = async (actorPerson: PersonSummary): Promise<BaconLawResult> => {
  const [actor, kevinBacon] = await Promise.all([loadPersonWithCredits(actorPerson), loadKevinBacon()])

  if (actor.person.id === kevinBacon.person.id) {
    return {
      actor,
      kevinBacon,
      degree: 0,
      steps: [],
    }
  }

  const directConnection = findDirectConnection(actor, kevinBacon)
  if (directConnection) {
    return directConnection
  }

  const sourceVisited = new Map<number, VisitedActorEntry>([
    [
      actor.person.id,
      {
        actor: actor.person,
        parentActorId: null,
        viaMedia: null,
      },
    ],
  ])
  const targetVisited = new Map<number, VisitedActorEntry>([
    [
      kevinBacon.person.id,
      {
        actor: kevinBacon.person,
        parentActorId: null,
        viaMedia: null,
      },
    ],
  ])

  let sourceFrontier: PersonSummary[] = [actor.person]
  let targetFrontier: PersonSummary[] = [kevinBacon.person]
  let expandedActorCount = 0

  for (let searchDepth = 0; searchDepth < MAX_DEGREES; searchDepth += 1) {
    if (!sourceFrontier.length || !targetFrontier.length) {
      break
    }

    const expandSourceSide = sourceFrontier.length <= targetFrontier.length
    const expansion = expandSourceSide
      ? await expandFrontier(sourceFrontier, sourceVisited, targetVisited)
      : await expandFrontier(targetFrontier, targetVisited, sourceVisited)

    expandedActorCount += expansion.expandedActorCount

    if (expansion.meetingActorId !== null) {
      return buildResult(actor, kevinBacon, sourceVisited, targetVisited, expansion.meetingActorId)
    }

    if (expandSourceSide) {
      sourceFrontier = expansion.nextFrontier
    } else {
      targetFrontier = expansion.nextFrontier
    }

    if (expandedActorCount >= MAX_ACTOR_EXPANSIONS) {
      break
    }
  }

  throw new Error(
    'No Bacon path was found within the current client-side search window. Try a more specific actor name or another search.',
  )
}

export const findBaconConnection = async (actorQuery: string): Promise<BaconLawResult> => {
  const actor = await resolveActor(actorQuery)
  return findBaconConnectionFromPerson(actor)
}
