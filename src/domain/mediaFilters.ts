import type { CastMember, MediaCredit, MediaTitle } from './media'

const TALK_GENRE_ID = 10767

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
