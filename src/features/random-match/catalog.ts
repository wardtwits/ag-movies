import type { MediaTitle, PersonSummary } from '../../domain/media'

export interface RandomTitlePair {
  label: string
  left: MediaTitle
  right: MediaTitle
}

export interface RandomActorPair {
  label: string
  left: PersonSummary
  right: PersonSummary
}

const movie = (id: number, title: string, genreIds: number[]): MediaTitle => ({
  id,
  mediaType: 'movie',
  title,
  originalTitle: title,
  genreIds,
  popularity: 0,
  voteCount: 0,
})

const tv = (id: number, title: string, genreIds: number[]): MediaTitle => ({
  id,
  mediaType: 'tv',
  title,
  originalTitle: title,
  genreIds,
  popularity: 0,
  voteCount: 0,
})

const actor = (id: number, name: string): PersonSummary => ({
  id,
  name,
  popularity: 0,
  profilePath: null,
})

export const RANDOM_TITLE_PAIRS: RandomTitlePair[] = [
  {
    label: 'Neo to Baba Yaga',
    left: movie(603, 'The Matrix', [28, 878]),
    right: movie(245891, 'John Wick', [28, 53]),
  },
  {
    label: 'Marvel cosmic crossover',
    left: movie(299536, 'Avengers: Infinity War', [12, 28, 878]),
    right: movie(118340, 'Guardians of the Galaxy', [28, 878, 12]),
  },
  {
    label: 'Heist ensemble',
    left: movie(161, "Ocean's Eleven", [53, 80]),
    right: movie(163, "Ocean's Twelve", [53, 80]),
  },
  {
    label: 'Pixar reunion',
    left: movie(862, 'Toy Story', [10751, 35, 16, 12]),
    right: movie(301528, 'Toy Story 4', [10751, 35, 16, 12]),
  },
  {
    label: 'Must-see sitcom universe',
    left: tv(3452, 'Frasier', [35, 10751]),
    right: tv(141, 'Cheers', [35]),
  },
]

export const RANDOM_ACTOR_PAIRS: RandomActorPair[] = [
  {
    label: 'Matrix constants',
    left: actor(6384, 'Keanu Reeves'),
    right: actor(2975, 'Laurence Fishburne'),
  },
  {
    label: 'Rom-com staples',
    left: actor(31, 'Tom Hanks'),
    right: actor(5344, 'Meg Ryan'),
  },
  {
    label: 'Boston collaborators',
    left: actor(1892, 'Matt Damon'),
    right: actor(880, 'Ben Affleck'),
  },
  {
    label: 'Seattle-to-Frasier bridge',
    left: actor(7090, 'Kelsey Grammer'),
    right: actor(21703, 'Peri Gilpin'),
  },
  {
    label: 'Awards-season duo',
    left: actor(72129, 'Jennifer Lawrence'),
    right: actor(51329, 'Bradley Cooper'),
  },
]
