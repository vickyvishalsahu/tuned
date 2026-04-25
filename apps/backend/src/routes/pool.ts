// Debug/testing route — used to inspect and pre-warm the candidate pool.
// Not called directly by the client in production.
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { buildContextVector } from '../services/contextService.js'
import { getCandidatePool } from '../services/poolService.js'
import { createSpotifyMusicCatalog } from '../catalog/spotify.js'
import { createLlmIntelligence } from '../intelligence/llm.js'
import type { RawContext } from '../types/context.js'

export default async (fastify: FastifyInstance, { prisma }: { prisma: PrismaClient }) => {
  fastify.post<{ Body: RawContext }>(
    '/pool/build',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      const catalog = createSpotifyMusicCatalog(request.userId, prisma)
      const intelligence = createLlmIntelligence()
      const cv = await buildContextVector(request.body, request.userId, fastify.redis)
      const pool = await getCandidatePool(request.userId, cv, prisma, fastify.redis, catalog, intelligence)
      return { count: pool.length, pool }
    },
  )
}
