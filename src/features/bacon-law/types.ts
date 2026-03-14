import type { MediaCredit, PersonSummary, PersonWithCredits } from '../../domain/media'

export interface BaconConnectionStep {
  fromActor: PersonSummary
  toActor: PersonSummary
  media: MediaCredit
  fromCharacter?: string
  toCharacter?: string
}

export interface BaconLawResult {
  actor: PersonWithCredits
  kevinBacon: PersonWithCredits
  degree: number
  steps: BaconConnectionStep[]
}
