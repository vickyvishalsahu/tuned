import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { getTasteProfile } from './profileService.js'
import { spotifyClient } from './spotifyClient.js'
import type { CandidateTrack } from '../types/profile.js'
import type { ContextVector } from '../types/context.js'
import type { MusicCatalog, PlayableTrack } from '../catalog/types.js'
import type { MusicIntelligence } from '../intelligence/types.js'

const POOL_TTL = 4 * 60 * 60 // 4 hours
const MIN_POOL_SIZE = 20
const SEARCH_BATCH_SIZE = 10 // max concurrent Spotify searches

const contextBucket = (cv: ContextVector) =>
  `${cv.timeSlot}:${cv.movementState}:${cv.weatherMood}`

const trackInContext = (track: CandidateTrack, cv: ContextVector): boolean => {
  // Synthetic tracks have no real features — always admit them and let scoring sort it out
  if (track.hasRealFeatures === false) return true

  const tf = cv.targetFeatures
  const f = track.features
  return (
    f.energy >= tf.energy[0] && f.energy <= tf.energy[1] &&
    f.valence >= tf.valence[0] && f.valence <= tf.valence[1] &&
    f.acousticness >= tf.acousticness[0] && f.acousticness <= tf.acousticness[1]
  )
}

const neutralFeatures = (): TrackFeatures => ({
  energy: 0.5,
  valence: 0.5,
  tempo: 120,
  acousticness: 0.5,
  instrumentalness: 0.3,
  danceability: 0.5,
  loudness: -8,
})

const midpoint = (range: [number, number]) => (range[0] + range[1]) / 2

const toLibraryCandidate = (track: PlayableTrack, savedIds: Set<string>): CandidateTrack => ({
  trackId:         track.trackId,
  trackName:       track.trackName,
  artistId:        '',
  artistName:      track.artistName,
  albumId:         '',
  albumName:       track.albumName,
  albumArtUrl:     track.albumArtUrl,
  durationMs:      track.durationMs,
  previewUrl:      track.previewUrl,
  features:        neutralFeatures(),
  popularity:      0,
  isInLibrary:     savedIds.has(track.trackId),
  source:          'library',
  hasRealFeatures: false,
})

const toRecommendationCandidate = (
  track: PlayableTrack,
  cv: ContextVector,
  savedIds: Set<string>,
): CandidateTrack => ({
  trackId:         track.trackId,
  trackName:       track.trackName,
  artistId:        '',
  artistName:      track.artistName,
  albumId:         '',
  albumName:       track.albumName,
  albumArtUrl:     track.albumArtUrl,
  durationMs:      track.durationMs,
  previewUrl:      track.previewUrl,
  features: {
    energy:           midpoint(cv.targetFeatures.energy),
    valence:          midpoint(cv.targetFeatures.valence),
    tempo:            midpoint(cv.targetFeatures.tempo),
    acousticness:     midpoint(cv.targetFeatures.acousticness),
    instrumentalness: 0.3,
    danceability:     0.5,
    loudness:         -8,
  },
  popularity:      0,
  isInLibrary:     savedIds.has(track.trackId),
  source:          'recommendation',
  hasRealFeatures: false,
})

// Resolve TrackIdentity objects to PlayableTracks in batches to avoid hammering Spotify search
const resolveBatched = async (
  identities: Array<{ artist: string; title: string }>,
  catalog: MusicCatalog,
): Promise<PlayableTrack[]> => {
  const results: PlayableTrack[] = []

  for (let i = 0; i < identities.length; i += SEARCH_BATCH_SIZE) {
    const batch = identities.slice(i, i + SEARCH_BATCH_SIZE)
    const resolved = await Promise.all(
      batch.map((identity) => catalog.search(identity.artist, identity.title))
    )
    for (const track of resolved) {
      if (track !== null) results.push(track)
    }
  }

  return results
}

export const buildCandidatePool = async (
  userId: string,
  cv: ContextVector,
  prisma: PrismaClient,
  redis: Redis,
  catalog: MusicCatalog,
  intelligence: MusicIntelligence,
): Promise<CandidateTrack[]> => {
  // profileService still uses spotifyClient directly — will be refactored separately
  const profile = await getTasteProfile(userId, prisma, redis, spotifyClient)

  // 1. Fetch saved tracks from catalog (platform data)
  const savedTracks = await catalog.getSavedTracks()
  const savedIds = new Set(savedTracks.map((track) => track.trackId))
  const excludeIds = new Set([...profile.recentTrackIds, ...profile.radioTrackIds])

  const libraryPool = savedTracks
    .filter((track) => !excludeIds.has(track.trackId))
    .map((track) => toLibraryCandidate(track, savedIds))
    .filter((candidate) => trackInContext(candidate, cv))

  // 2. Get LLM recommendations (cached via 4h pool TTL — never called in hot path)
  const identities = await intelligence.recommend(cv, profile)

  // 3. Resolve each identity to a PlayableTrack (batched, max 10 concurrent)
  const resolvedTracks = await resolveBatched(identities, catalog)
  console.log(`[intelligence] requested ${identities.length}, resolved ${resolvedTracks.length}`)

  const recPool = resolvedTracks
    .filter((track) => !excludeIds.has(track.trackId))
    .map((track) => toRecommendationCandidate(track, cv, savedIds))
    .filter((candidate) => trackInContext(candidate, cv))

  // 4. Merge — library takes precedence on duplicates
  const seen = new Set<string>()
  const pool: CandidateTrack[] = []

  for (const track of [...libraryPool, ...recPool]) {
    if (!seen.has(track.trackId)) {
      seen.add(track.trackId)
      pool.push(track)
    }
  }

  const bucket = contextBucket(cv)
  console.log(`[pool] built ${pool.length} candidates for ${userId} bucket=${bucket}`)
  await redis.set(`pool:${userId}:${bucket}`, JSON.stringify(pool), 'EX', POOL_TTL)

  return pool
}

export const getCandidatePool = async (
  userId: string,
  cv: ContextVector,
  prisma: PrismaClient,
  redis: Redis,
  catalog: MusicCatalog,
  intelligence: MusicIntelligence,
): Promise<CandidateTrack[]> => {
  const bucket = contextBucket(cv)
  const cached = await redis.get(`pool:${userId}:${bucket}`)

  if (cached) {
    const pool = JSON.parse(cached) as CandidateTrack[]
    if (pool.length > MIN_POOL_SIZE) {
      console.log(`[pool] cache hit — ${pool.length} tracks for bucket=${bucket}`)
      return pool
    }
  }

  return buildCandidatePool(userId, cv, prisma, redis, catalog, intelligence)
}
