// Debug/testing route — in production, context vectors are built internally by /next-track.
// The client should never call this directly.
import type { FastifyInstance } from 'fastify'
import { buildContextVector } from '../services/contextService.js'
import type { RawContext } from '../types/context.js'

export default async (fastify: FastifyInstance) => {
  fastify.post<{ Body: RawContext }>(
    '/context/vector',
    { preHandler: [fastify.authenticate] },
    async (request) => {
      return buildContextVector(request.body, request.userId, fastify.redis)
    },
  )
}
