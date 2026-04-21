import type { FastifyPluginAsync } from 'fastify'
import { eq, asc } from 'drizzle-orm'
import { getDb, itRequests, requestComments } from '@its/db'
import type { AddCommentBody } from '@its/shared'

export const commentsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/requests/:id/comments
  fastify.get<{ Params: { id: string }; Querystring: { internal?: string } }>(
    '/:id/comments',
    async (request, reply) => {
      const [req] = await db.select({ id: itRequests.id }).from(itRequests).where(eq(itRequests.id, request.params.id))
      if (!req) return reply.status(404).send({ error: 'Request not found' })

      const showInternal = request.query.internal === 'true'
      const rows = await db
        .select()
        .from(requestComments)
        .where(
          showInternal
            ? eq(requestComments.requestId, request.params.id)
            : eq(requestComments.requestId, request.params.id),
        )
        .orderBy(asc(requestComments.createdAt))

      return showInternal ? rows : rows.filter((r) => !r.isInternal)
    },
  )

  // POST /api/requests/:id/comments
  fastify.post<{ Params: { id: string }; Body: AddCommentBody }>('/:id/comments', {
    schema: {
      body: {
        type: 'object',
        required: ['authorId', 'message'],
        properties: {
          authorId: { type: 'string', minLength: 1 },
          message: { type: 'string', minLength: 1 },
          isInternal: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const [req] = await db.select({ id: itRequests.id }).from(itRequests).where(eq(itRequests.id, request.params.id))
    if (!req) return reply.status(404).send({ error: 'Request not found' })

    const [comment] = await db
      .insert(requestComments)
      .values({
        requestId: request.params.id,
        authorId: request.body.authorId,
        message: request.body.message,
        isInternal: request.body.isInternal ?? false,
      })
      .returning()

    return reply.status(201).send(comment)
  })
}
