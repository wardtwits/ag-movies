import type { MediaTitle, MediaWithCast, PersonSummary, PersonWithCredits } from '../../domain/media'
import type { BaconLawResult } from '../bacon-law/types'
import type { CommonCastResult } from '../common-cast/types'
import type { CommonTitlesResult } from '../common-titles/types'

export type ShareMode = 'actors' | 'titles' | 'bacon'
export type ShareSelection = MediaTitle | PersonSummary | null

export type ShareComparisonState =
  | { kind: 'actors'; result: CommonTitlesResult }
  | { kind: 'titles'; result: CommonCastResult }

export interface ShareSnapshot {
  version: 1
  mode: ShareMode
  filterExtras: boolean
  showingHiddenExtras: boolean
  primarySelection: ShareSelection
  secondarySelection: ShareSelection
  comparisonState: ShareComparisonState | null
  baconResult: BaconLawResult | null
}

const SHARE_HASH_PREFIX = '#share='
const SHARE_SNAPSHOT_VERSION = 1
const MAX_SHARE_URL_LENGTH = 32000

const emptyPersonWithCredits = (person: PersonSummary): PersonWithCredits => ({
  person,
  credits: [],
})

const emptyMediaWithCast = (media: MediaTitle): MediaWithCast => ({
  media,
  cast: [],
})

const trimComparisonState = (state: ShareComparisonState | null): ShareComparisonState | null => {
  if (!state) {
    return null
  }

  if (state.kind === 'actors') {
    return {
      kind: 'actors',
      result: {
        left: emptyPersonWithCredits(state.result.left.person),
        right: emptyPersonWithCredits(state.result.right.person),
        sharedTitles: state.result.sharedTitles,
      },
    }
  }

  return {
    kind: 'titles',
    result: {
      left: emptyMediaWithCast(state.result.left.media),
      right: emptyMediaWithCast(state.result.right.media),
      sharedActors: state.result.sharedActors,
    },
  }
}

const trimBaconResult = (result: BaconLawResult | null): BaconLawResult | null => {
  if (!result) {
    return null
  }

  return {
    actor: emptyPersonWithCredits(result.actor.person),
    kevinBacon: emptyPersonWithCredits(result.kevinBacon.person),
    degree: result.degree,
    steps: result.steps,
  }
}

const toBase64Url = (value: string): string => {
  const bytes = new TextEncoder().encode(value)
  let binary = ''

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const fromBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4))
  const binary = atob(`${normalized}${padding}`)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))

  return new TextDecoder().decode(bytes)
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isShareMode = (value: unknown): value is ShareMode =>
  value === 'actors' || value === 'titles' || value === 'bacon'

const normalizeSelection = (value: unknown): ShareSelection => {
  if (!isObject(value) || typeof value.id !== 'number') {
    return null
  }

  if (typeof value.name === 'string') {
    return {
      id: value.id,
      name: value.name,
      knownForDepartment: typeof value.knownForDepartment === 'string' ? value.knownForDepartment : undefined,
      popularity: typeof value.popularity === 'number' ? value.popularity : 0,
      profilePath: typeof value.profilePath === 'string' || value.profilePath === null ? value.profilePath : undefined,
    }
  }

  if (typeof value.title === 'string' && (value.mediaType === 'movie' || value.mediaType === 'tv')) {
    return {
      id: value.id,
      mediaType: value.mediaType,
      title: value.title,
      originalTitle: typeof value.originalTitle === 'string' ? value.originalTitle : value.title,
      genreIds: Array.isArray(value.genreIds) ? value.genreIds.filter((entry): entry is number => typeof entry === 'number') : [],
      releaseDate: typeof value.releaseDate === 'string' ? value.releaseDate : undefined,
      popularity: typeof value.popularity === 'number' ? value.popularity : 0,
      voteCount: typeof value.voteCount === 'number' ? value.voteCount : 0,
      posterPath: typeof value.posterPath === 'string' || value.posterPath === null ? value.posterPath : undefined,
    }
  }

  return null
}

export const createShareSnapshot = (snapshot: Omit<ShareSnapshot, 'version'>): ShareSnapshot => ({
  version: SHARE_SNAPSHOT_VERSION,
  mode: snapshot.mode,
  filterExtras: snapshot.filterExtras,
  showingHiddenExtras: snapshot.showingHiddenExtras,
  primarySelection: snapshot.primarySelection,
  secondarySelection: snapshot.secondarySelection,
  comparisonState: trimComparisonState(snapshot.comparisonState),
  baconResult: trimBaconResult(snapshot.baconResult),
})

const buildShareUrl = (baseUrl: string, snapshot: ShareSnapshot): string => {
  const encoded = toBase64Url(JSON.stringify(snapshot))
  return `${baseUrl}${SHARE_HASH_PREFIX}${encoded}`
}

export const createShareUrl = (baseUrl: string, snapshot: Omit<ShareSnapshot, 'version'>): string => {
  const fullSnapshot = createShareSnapshot(snapshot)
  const fullUrl = buildShareUrl(baseUrl, fullSnapshot)

  if (fullUrl.length <= MAX_SHARE_URL_LENGTH) {
    return fullUrl
  }

  return buildShareUrl(baseUrl, {
    ...fullSnapshot,
    comparisonState: null,
    baconResult: null,
  })
}

export const parseShareSnapshotFromHash = (hash: string): ShareSnapshot | null => {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) {
    return null
  }

  try {
    const payload = JSON.parse(fromBase64Url(hash.slice(SHARE_HASH_PREFIX.length))) as unknown
    if (!isObject(payload) || payload.version !== SHARE_SNAPSHOT_VERSION || !isShareMode(payload.mode)) {
      return null
    }

    return {
      version: SHARE_SNAPSHOT_VERSION,
      mode: payload.mode,
      filterExtras: payload.filterExtras !== false,
      showingHiddenExtras: payload.showingHiddenExtras === true,
      primarySelection: normalizeSelection(payload.primarySelection),
      secondarySelection: normalizeSelection(payload.secondarySelection),
      comparisonState: isObject(payload.comparisonState) ? (payload.comparisonState as unknown as ShareComparisonState) : null,
      baconResult: isObject(payload.baconResult) ? (payload.baconResult as unknown as BaconLawResult) : null,
    }
  } catch {
    return null
  }
}
