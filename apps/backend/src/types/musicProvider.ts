import type { PrismaClient } from '@prisma/client'
import type { CandidateTrack } from './profile.js'
import type { ContextVector } from './context.js'

export type ProviderTrack = {
  id: string
  name: string
  duration_ms: number
  popularity: number
  preview_url: string | null
  artists: Array<{ id: string; name: string }>
  album: { id: string; name: string; images: Array<{ url: string }> }
}

export type ProviderAlbumTrack = {
  id: string
  name: string
  track_number: number
  artists: Array<{ id: string; name: string }>
}

export type ProviderArtist = {
  id: string
  name: string
  genres: string[]
}

export type RecommendationRequest = {
  seedArtistIds?: string[]
  seedGenreNames?: string[]
  targetFeatures: ContextVector['targetFeatures']
  limit?: number
}

export type MusicProvider = {
  getTokenForUser(userId: string, prisma: PrismaClient): Promise<string>
  getTopArtists(token: string): Promise<ProviderArtist[]>
  getTopTracks(token: string): Promise<ProviderTrack[]>
  getRecentlyPlayed(token: string): Promise<ProviderTrack[]>
  getSavedTracks(token: string): Promise<ProviderTrack[]>
  getRecommendations(token: string, req: RecommendationRequest): Promise<CandidateTrack[]>
  getAlbumTracks(token: string, albumId: string): Promise<ProviderAlbumTrack[]>
}
