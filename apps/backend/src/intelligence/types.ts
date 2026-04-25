import type { ContextVector } from '../types/context'
import type { TasteProfile } from '../types/profile'

export type TrackIdentity = {
  artist: string
  title:  string
}

export type MusicIntelligence = {
  recommend(context: ContextVector, profile: TasteProfile): Promise<TrackIdentity[]>
}
