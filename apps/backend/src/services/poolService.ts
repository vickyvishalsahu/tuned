import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { spotifyClient } from './spotifyClient.js'
import { getTasteProfile } from './profileService.js'
import type { CandidateTrack, TrackFeatures } from '../types/profile.js'
import type { ContextVector } from '../types/context.js'
import type { SpotifyTrack } from './spotifyClient.js'

const POOL_TTL = 4 * 60 * 60 // 4 hours
const MIN_POOL_SIZE = 20

const contextBucket = (cv: ContextVector) =>
  `${cv.timeSlot}:${cv.movementState}:${cv.weatherMood}`

const midpoint = (range: [number, number]) => (range[0] + range[1]) / 2

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

const syntheticFeaturesFromTargets = (featureTargets: {
  targetEnergy?: number
  targetValence?: number
  targetTempo?: number
  targetAcousticness?: number
}): TrackFeatures => ({
  energy:           featureTargets.targetEnergy      ?? 0.5,
  valence:          featureTargets.targetValence     ?? 0.5,
  tempo:            (featureTargets.targetTempo      ?? 0.5) * 200,
  acousticness:     featureTargets.targetAcousticness ?? 0.5,
  instrumentalness: 0.3,
  danceability:     0.5,
  loudness:         -8,
})

const neutralFeatures = (): TrackFeatures => ({
  energy: 0.5,
  valence: 0.5,
  tempo: 120,
  acousticness: 0.5,
  instrumentalness: 0.3,
  danceability: 0.5,
  loudness: -8,
})

export const buildCandidatePool = async (
  userId: string,
  cv: ContextVector,
  prisma: PrismaClient,
  redis: Redis,
): Promise<CandidateTrack[]> => {
  const profile = await getTasteProfile(userId, prisma, redis)
  const token = await spotifyClient.getTokenForUser(userId, prisma)
  const excludeIds = new Set([...profile.recentTrackIds, ...profile.radioTrackIds])

  const featureTargets = {
    targetEnergy:      midpoint(cv.targetFeatures.energy),
    minEnergy:         cv.targetFeatures.energy[0],
    maxEnergy:         cv.targetFeatures.energy[1],
    targetValence:     midpoint(cv.targetFeatures.valence),
    minValence:        cv.targetFeatures.valence[0],
    maxValence:        cv.targetFeatures.valence[1],
    targetTempo:       midpoint(cv.targetFeatures.tempo),
    targetAcousticness: midpoint(cv.targetFeatures.acousticness),
  }

  // Fetch all three sources concurrently
  const [savedTracks, recTracks, discoveryTracks] = await Promise.all([
    spotifyClient.getSavedTracks(token),
    spotifyClient.getRecommendations(token, {
      seedArtists: profile.topArtistIds.slice(0, 2),
      seedGenres: profile.topGenres.slice(0, 3),
      limit: 100,
      ...featureTargets,
    }),
    cv.discoveryWeight > 0.4
      ? spotifyClient.getRecommendations(token, {
          seedArtists: profile.topArtistIds.slice(2, 5),
          limit: 50,
          ...featureTargets,
        })
      : Promise.resolve([]),
  ])

  const savedIds = new Set(savedTracks.map(track => track.id))
  const syntheticFeatures = syntheticFeaturesFromTargets(featureTargets)

  const toCandidate = (
    track: SpotifyTrack,
    source: CandidateTrack['source'],
    features: TrackFeatures,
    hasRealFeatures: boolean,
  ): CandidateTrack => ({
    trackId:      track.id,
    trackName:    track.name,
    artistId:     track.artists[0]?.id ?? '',
    artistName:   track.artists[0]?.name ?? '',
    albumId:      track.album.id,
    albumName:    track.album.name,
    albumArtUrl:  track.album.images[0]?.url ?? '',
    durationMs:   track.duration_ms,
    previewUrl:   track.preview_url ?? null,
    features,
    popularity:   track.popularity,
    isInLibrary:  savedIds.has(track.id),
    source,
    hasRealFeatures,
  })

  const libraryPool = savedTracks
    .filter(track => !excludeIds.has(track.id))
    .map(track => toCandidate(track, 'library', neutralFeatures(), false))
    .filter(candidate => trackInContext(candidate, cv))

  const recPool = recTracks
    .filter(track => !excludeIds.has(track.id))
    .map(track => toCandidate(track, 'recommendation', syntheticFeatures, false))
    .filter(candidate => trackInContext(candidate, cv))

  const discoveryPool = discoveryTracks
    .filter(track => !excludeIds.has(track.id))
    .map(track => toCandidate(track, 'recommendation', syntheticFeatures, false))
    .filter(candidate => trackInContext(candidate, cv))

  // Merge — library takes precedence on duplicates (~40% library, ~40% rec, ~20% discovery)
  const seen = new Set<string>()
  const pool: CandidateTrack[] = []

  for (const track of [...libraryPool, ...recPool, ...discoveryPool]) {
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

  return buildCandidatePool(userId, cv, prisma, redis)
}
