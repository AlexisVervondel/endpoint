import type { FastifyPluginAsync } from 'fastify'
import { eq, desc, and } from 'drizzle-orm'
import { getDb, itRequests, requestComments } from '@its/db'
import type {
  CreateRequestBody,
  UpdateRequestBody,
  ApproveRequestBody,
  RejectRequestBody,
  CompleteRequestBody,
} from '@its/shared'
import { computeSlaDue, isSlaBreached } from '../services/sla.js'
import { notifySlack } from '../services/notifications.js'

export const requestsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/requests
  fastify.get('/', async (request) => {
    const { status, category, requesterId, limit = '50', offset = '0' } = request.query as Record<string, string>
    const conditions = []
    if (status) conditions.push(eq(itRequests.status, status as any))
    if (category) conditions.push(eq(itRequests.category, category as any))
    if (requesterId) conditions.push(eq(itRequests.requesterId, requesterId))

    return db
      .select()
      .from(itRequests)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(itRequests.createdAt))
      .limit(Number(limit))
      .offset(Number(offset))
  })

  // GET /api/requests/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const [row] = await db.select().from(itRequests).where(eq(itRequests.id, request.params.id))
    if (!row) return reply.status(404).send({ error: 'Request not found' })
    return row
  })

  // POST /api/requests
  fastify.post<{ Body: CreateRequestBody }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'description', 'category', 'requesterId', 'requesterEmail'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', minLength: 1 },
          category: { type: 'string', enum: ['hardware', 'software_license', 'access', 'infra'] },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          requesterId: { type: 'string', minLength: 1 },
          requesterEmail: { type: 'string', format: 'email' },
          managerId: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body
    const now = new Date()
    const slaDueAt = computeSlaDue(body.category, now)

    const [row] = await db
      .insert(itRequests)
      .values({
        title: body.title,
        description: body.description,
        category: body.category,
        priority: body.priority ?? 'medium',
        requesterId: body.requesterId,
        requesterEmail: body.requesterEmail,
        managerId: body.managerId ?? null,
        metadata: body.metadata ?? {},
        slaDueAt,
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    await db.insert(requestComments).values({
      requestId: row!.id,
      authorId: 'system',
      message: `Request submitted by ${body.requesterEmail}`,
      isInternal: true,
    })

    await notifySlack('submitted', serializeRequest(row!))

    return reply.status(201).send(row)
  })

  // PATCH /api/requests/:id
  fastify.patch<{ Params: { id: string }; Body: UpdateRequestBody }>('/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          assigneeId: { type: 'string' },
          managerId: { type: 'string' },
          metadata: { type: 'object' },
        },
      },
    },
  }, async (request, reply) => {
    const [before] = await db.select().from(itRequests).where(eq(itRequests.id, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Request not found' })

    const body = request.body
    const now = new Date()
    const updates: Partial<typeof itRequests.$inferInsert> = { updatedAt: now }

    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.priority !== undefined) updates.priority = body.priority
    if (body.assigneeId !== undefined) updates.assigneeId = body.assigneeId
    if (body.managerId !== undefined) updates.managerId = body.managerId
    if (body.metadata !== undefined) updates.metadata = body.metadata

    const [after] = await db.update(itRequests).set(updates).where(eq(itRequests.id, request.params.id)).returning()
    return after
  })

  // POST /api/requests/:id/approve
  fastify.post<{ Params: { id: string }; Body: ApproveRequestBody }>('/:id/approve', {
    schema: {
      body: {
        type: 'object',
        required: ['approvedBy'],
        properties: {
          approvedBy: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const [before] = await db.select().from(itRequests).where(eq(itRequests.id, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Request not found' })
    if (before.status !== 'pending') return reply.status(409).send({ error: `Cannot approve a request with status ${before.status}` })

    const now = new Date()
    const [after] = await db
      .update(itRequests)
      .set({ status: 'approved', approvedAt: now, approvedBy: request.body.approvedBy, updatedAt: now })
      .where(eq(itRequests.id, request.params.id))
      .returning()

    await db.insert(requestComments).values({
      requestId: before.id,
      authorId: request.body.approvedBy,
      message: `Request approved by ${request.body.approvedBy}`,
      isInternal: true,
    })

    await notifySlack('approved', serializeRequest(after!))
    return after
  })

  // POST /api/requests/:id/reject
  fastify.post<{ Params: { id: string }; Body: RejectRequestBody }>('/:id/reject', {
    schema: {
      body: {
        type: 'object',
        required: ['rejectedBy', 'rejectionReason'],
        properties: {
          rejectedBy: { type: 'string', minLength: 1 },
          rejectionReason: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const [before] = await db.select().from(itRequests).where(eq(itRequests.id, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Request not found' })
    if (!['pending', 'approved'].includes(before.status)) {
      return reply.status(409).send({ error: `Cannot reject a request with status ${before.status}` })
    }

    const now = new Date()
    const [after] = await db
      .update(itRequests)
      .set({
        status: 'rejected',
        rejectedAt: now,
        rejectedBy: request.body.rejectedBy,
        rejectionReason: request.body.rejectionReason,
        updatedAt: now,
      })
      .where(eq(itRequests.id, request.params.id))
      .returning()

    await db.insert(requestComments).values({
      requestId: before.id,
      authorId: request.body.rejectedBy,
      message: `Request rejected: ${request.body.rejectionReason}`,
      isInternal: true,
    })

    await notifySlack('rejected', serializeRequest(after!))
    return after
  })

  // POST /api/requests/:id/start
  fastify.post<{ Params: { id: string } }>('/:id/start', async (request, reply) => {
    const [before] = await db.select().from(itRequests).where(eq(itRequests.id, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Request not found' })
    if (before.status !== 'approved') return reply.status(409).send({ error: 'Request must be approved before starting' })

    const [after] = await db
      .update(itRequests)
      .set({ status: 'in_progress', updatedAt: new Date() })
      .where(eq(itRequests.id, request.params.id))
      .returning()

    await db.insert(requestComments).values({
      requestId: before.id,
      authorId: 'system',
      message: 'Fulfillment started',
      isInternal: true,
    })

    return after
  })

  // POST /api/requests/:id/complete
  fastify.post<{ Params: { id: string }; Body: CompleteRequestBody }>('/:id/complete', {
    schema: {
      body: {
        type: 'object',
        required: ['completedBy'],
        properties: {
          completedBy: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const [before] = await db.select().from(itRequests).where(eq(itRequests.id, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Request not found' })
    if (!['approved', 'in_progress'].includes(before.status)) {
      return reply.status(409).send({ error: `Cannot complete a request with status ${before.status}` })
    }

    const now = new Date()
    const breach = isSlaBreached(before.category, before.createdAt, now)

    const [after] = await db
      .update(itRequests)
      .set({ status: 'completed', completedAt: now, slaBreach: breach, updatedAt: now })
      .where(eq(itRequests.id, request.params.id))
      .returning()

    await db.insert(requestComments).values({
      requestId: before.id,
      authorId: request.body.completedBy,
      message: `Request completed by ${request.body.completedBy}${breach ? ' (SLA breached)' : ''}`,
      isInternal: true,
    })

    await notifySlack('completed', serializeRequest(after!))
    return after
  })

  // POST /api/requests/:id/cancel
  fastify.post<{ Params: { id: string } }>('/:id/cancel', async (request, reply) => {
    const [before] = await db.select().from(itRequests).where(eq(itRequests.id, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Request not found' })
    if (['completed', 'cancelled'].includes(before.status)) {
      return reply.status(409).send({ error: `Cannot cancel a request with status ${before.status}` })
    }

    const [after] = await db
      .update(itRequests)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(eq(itRequests.id, request.params.id))
      .returning()

    await db.insert(requestComments).values({
      requestId: before.id,
      authorId: 'system',
      message: 'Request cancelled',
      isInternal: true,
    })

    return after
  })
}

function serializeRequest(row: typeof itRequests.$inferSelect): import('@its/shared').ItRequest {
  return {
    ...row,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    slaDueAt: row.slaDueAt.toISOString(),
    approvedAt: row.approvedAt?.toISOString() ?? null,
    rejectedAt: row.rejectedAt?.toISOString() ?? null,
    completedAt: row.completedAt?.toISOString() ?? null,
  }
}
