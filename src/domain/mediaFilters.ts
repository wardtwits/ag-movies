import type { CastMember, MediaCredit, MediaTitle, PersonSummary } from './media'

const TALK_GENRE_ID = 10767
const BACON_EXCLUDED_CHARACTER_MARKERS = ['unknown', 'uncredited', 'extra', 'background', 'crowd']

const normalizeCharacter = (value?: string): string | undefined => value?.trim().toLowerCase()

export const isSelfCharacter = (value?: string): boolean => {
  const normalized = normalizeCharacter(value)
  return normalized ? normalized.includes('self') : false
}

export const isExcludedTvGenre = (media: Pick<MediaTitle, 'mediaType' | 'genreIds'>): boolean =>
  media.mediaType === 'tv' && media.genreIds.includes(TALK_GENRE_ID)

export const isVisibleMediaTitle = (media: Pick<MediaTitle, 'mediaType' | 'genreIds'>): boolean =>
  !isExcludedTvGenre(media)

export const isVisibleMediaCredit = (
  credit: Pick<MediaCredit, 'mediaType' | 'genreIds' | 'character'>,
): boolean => !isExcludedTvGenre(credit) && !isSelfCharacter(credit.character)

export const isVisibleCastMember = (member: Pick<CastMember, 'character'>): boolean => !isSelfCharacter(member.character)

const hasBaconExcludedCharacterMarker = (value?: string): boolean => {
  const normalized = normalizeCharacter(value)
  return normalized ? BACON_EXCLUDED_CHARACTER_MARKERS.some((marker) => normalized.includes(marker)) : false
}

const isLikelyUnknownPersonName = (value?: string): boolean => {
  const normalized = normalizeCharacter(value)
  return normalized === 'unknown' || normalized?.startsWith('unknown ') === true
}

export const isEligibleBaconPerson = (
  person: Pick<PersonSummary, 'knownForDepartment' | 'name'>,
): boolean => person.knownForDepartment === 'Acting' && !isLikelyUnknownPersonName(person.name)

export const isEligibleBaconMediaCredit = (
  credit: Pick<MediaCredit, 'character'>,
): boolean => !hasBaconExcludedCharacterMarker(credit.character)

export const isEligibleBaconCastMember = (
  member: Pick<CastMember, 'name' | 'character'>,
): boolean => !isLikelyUnknownPersonName(member.name) && !hasBaconExcludedCharacterMarker(member.character)
