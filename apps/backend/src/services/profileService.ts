import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { spotifyClient } from './spotifyClient.js'
import type { TasteProfile, AudioFeatureWeights } from '../types/profile.js'

const PROFILE_TTL = 2 * 60 * 60 // 2 hours

export const buildTasteProfile = async (
  userId: string,
  prisma: PrismaClient,
  redis: Redis,
): Promise<TasteProfile> => {
  const token = await spotifyClient.getTokenForUser(userId, prisma)

  const [topArtists, topTracks, recentTracks] = await Promise.all([
    spotifyClient.getTopArtists(token),
    spotifyClient.getTopTracks(token),
    spotifyClient.getRecentlyPlayed(token),
  ])

  const topArtistIds = topArtists.map(a => a.id)
  const topGenres = [...new Set(topArtists.flatMap(a => a.genres))].slice(0, 10)

  // Average audio features of top tracks → baseline weights
  const featureMap = await spotifyClient.getAudioFeatures(token, topTracks.map(t => t.id))
  const audioFeatureWeights = averageFeatures(featureMap)

  const recentTrackIds = recentTracks.map(t => t.id)

  // Radio's own play history from Postgres (last 200)
  const playEvents = await prisma.playEvent.findMany({
    where: { userId },
    orderBy: { playedAt: 'desc' },
    take: 200,
    select: { trackId: true },
  })
  const radioTrackIds = playEvents.map(e => e.trackId)

  const profile: TasteProfile = {
    userId,
    topArtistIds,
    topGenres,
    audioFeatureWeights,
    recentTrackIds,
    radioTrackIds,
    updatedAt: new Date(),
  }

  // Persist to Postgres
  await prisma.userProfile.upsert({
    where: { userId },
    create: {
      userId,
      topArtistIds,
      topGenres,
      audioFeatureWeights,
      recentTrackIds,
      radioTrackIds,
    },
    update: {
      topArtistIds,
      topGenres,
      audioFeatureWeights,
      recentTrackIds,
      radioTrackIds,
    },
  })

  // Cache in Redis
  await redis.set(`user:${userId}:profile`, JSON.stringify(profile), 'EX', PROFILE_TTL)

  return profile
}

export const getTasteProfile = async (
  userId: string,
  prisma: PrismaClient,
  redis: Redis,
): Promise<TasteProfile> => {
  const cached = await redis.get(`user:${userId}:profile`)
  if (cached) return JSON.parse(cached) as TasteProfile
  return buildTasteProfile(userId, prisma, redis)
}

const averageFeatures = (featureMap: Map<string, { energy: number; valence: number; tempo: number; acousticness: number; instrumentalness: number; danceability: number }>): AudioFeatureWeights => {
  const values = [...featureMap.values()]
  if (values.length === 0) {
    return { energy: 0.5, valence: 0.5, tempo: 0.5, acousticness: 0.5, instrumentalness: 0.5, danceability: 0.5 }
  }
  const sum = values.reduce(
    (acc, f) => ({
      energy: acc.energy + f.energy,
      valence: acc.valence + f.valence,
      tempo: acc.tempo + f.tempo / 200, // normalize BPM to 0–1
      acousticness: acc.acousticness + f.acousticness,
      instrumentalness: acc.instrumentalness + f.instrumentalness,
      danceability: acc.danceability + f.danceability,
    }),
    { energy: 0, valence: 0, tempo: 0, acousticness: 0, instrumentalness: 0, danceability: 0 },
  )
  const n = values.length
  return {
    energy: sum.energy / n,
    valence: sum.valence / n,
    tempo: sum.tempo / n,
    acousticness: sum.acousticness / n,
    instrumentalness: sum.instrumentalness / n,
    danceability: sum.danceability / n,
  }
}
