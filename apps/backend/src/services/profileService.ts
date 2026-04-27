import type { PrismaClient } from '@prisma/client'
import type { Redis } from 'ioredis'
import { inferFeaturesFromGenres } from './featureInference.js'
import type { TasteProfile } from '../types/profile.js'
import type { MusicProvider } from '../types/musicProvider.js'

const PROFILE_TTL = 2 * 60 * 60 // 2 hours

export const buildTasteProfile = async (
  userId: string,
  prisma: PrismaClient,
  redis: Redis,
  provider: MusicProvider,
): Promise<TasteProfile> => {
  const token = await provider.getTokenForUser(userId, prisma)

  const [topArtists, recentTracks] = await Promise.all([
    provider.getTopArtists(token),
    provider.getRecentlyPlayed(token),
  ])

  const topArtistIds = topArtists.map(artist => artist.id)
  const topGenres = [...new Set(topArtists.flatMap(artist => artist.genres))].slice(0, 10)

  const audioFeatureWeights = inferFeaturesFromGenres(topGenres)

  const recentTrackIds = recentTracks.map(track => track.id)

  // Tuned's own play history from Postgres (last 200)
  const playEvents = await prisma.playEvent.findMany({
    where: { userId },
    orderBy: { playedAt: 'desc' },
    take: 200,
    select: { trackId: true },
  })
  const tunedTrackIds = playEvents.map(event => event.trackId)

  const profile: TasteProfile = {
    userId,
    topArtistIds,
    topGenres,
    audioFeatureWeights,
    recentTrackIds,
    tunedTrackIds,
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
      tunedTrackIds,
    },
    update: {
      topArtistIds,
      topGenres,
      audioFeatureWeights,
      recentTrackIds,
      tunedTrackIds,
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
  provider: MusicProvider,
): Promise<TasteProfile> => {
  const cached = await redis.get(`user:${userId}:profile`)
  if (cached) return JSON.parse(cached) as TasteProfile
  return buildTasteProfile(userId, prisma, redis, provider)
}
