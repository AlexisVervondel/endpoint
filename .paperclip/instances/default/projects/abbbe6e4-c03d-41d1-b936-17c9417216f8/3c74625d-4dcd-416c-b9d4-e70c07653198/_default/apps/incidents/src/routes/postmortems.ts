import type { FastifyPluginAsync } from 'fastify'
import { eq } from 'drizzle-orm'
import { getDb, incidents, postmortems } from '@its/db'
import type { CreatePostmortemBody, UpdatePostmortemBody } from '@its/shared'
import { writeAuditLog } from '../services/audit.js'

export const postmortemRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  const postmortemBodySchema = {
    type: 'object',
    properties: {
      summary: { type: 'string' },
      timeline: { type: 'string' },
      rootCause: { type: 'string' },
      contributingFactors: { type: 'string' },
      impactSummary: { type: 'string' },
      affectedUsersCount: { type: 'number', nullable: true },
      dataExposed: { type: 'boolean' },
      mitigationSteps: { type: 'string' },
      resolutionSteps: { type: 'string' },
      actionItems: { type: 'array' },
      lessonsLearned: { type: 'string' },
      evidenceCollected: { type: 'string' },
      notificationsSent: { type: 'string' },
    },
  }

  // GET /api/incidents/:id/postmortem
  fastify.get<{ Params: { id: string } }>('/:id/postmortem', async (request, reply) => {
    const [row] = await db
      .select()
      .from(postmortems)
      .where(eq(postmortems.incidentId, request.params.id))
    if (!row) return reply.status(404).send({ error: 'Postmortem not found' })
    return row
  })

  // POST /api/incidents/:id/postmortem
  fastify.post<{ Params: { id: string }; Body: CreatePostmortemBody }>('/:id/postmortem', {
    schema: {
      body: {
        ...postmortemBodySchema,
        required: [
          'summary', 'timeline', 'rootCause', 'contributingFactors',
          'impactSummary', 'dataExposed', 'mitigationSteps', 'resolutionSteps',
          'lessonsLearned', 'evidenceCollected', 'notificationsSent',
        ],
      },
    },
  }, async (request, reply) => {
    const [incident] = await db.select({ id: incidents.id }).from(incidents).where(eq(incidents.id, request.params.id))
    if (!incident) return reply.status(404).send({ error: 'Incident not found' })

    // Check for existing postmortem
    const [existing] = await db.select({ id: postmortems.id }).from(postmortems).where(eq(postmortems.incidentId, request.params.id))
    if (existing) return reply.status(409).send({ error: 'Postmortem already exists, use PATCH to update' })

    const body = request.body
    // authorId is always the authenticated caller
    const authorId = request.user.sub

    const [pm] = await db
      .insert(postmortems)
      .values({
        incidentId: request.params.id,
        authorId,
        summary: body.summary,
        timeline: body.timeline,
        rootCause: body.rootCause,
        contributingFactors: body.contributingFactors,
        impactSummary: body.impactSummary,
        affectedUsersCount: body.affectedUsersCount ?? null,
        dataExposed: body.dataExposed,
        mitigationSteps: body.mitigationSteps,
        resolutionSteps: body.resolutionSteps,
        actionItems: body.actionItems ?? [],
        lessonsLearned: body.lessonsLearned,
        evidenceCollected: body.evidenceCollected,
        notificationsSent: body.notificationsSent,
      })
      .returning()

    await writeAuditLog(authorId, 'postmortem.created', 'incident', request.params.id, null, pm, request)

    return reply.status(201).send(pm)
  })

  // PATCH /api/incidents/:id/postmortem
  fastify.patch<{ Params: { id: string }; Body: UpdatePostmortemBody }>('/:id/postmortem', {
    schema: { body: postmortemBodySchema },
  }, async (request, reply) => {
    const [before] = await db
      .select()
      .from(postmortems)
      .where(eq(postmortems.incidentId, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Postmortem not found' })

    const body = request.body
    const updates: Partial<typeof postmortems.$inferInsert> = { updatedAt: new Date() }

    const fields = [
      'summary', 'timeline', 'rootCause', 'contributingFactors', 'impactSummary',
      'affectedUsersCount', 'dataExposed', 'mitigationSteps', 'resolutionSteps',
      'actionItems', 'lessonsLearned', 'evidenceCollected', 'notificationsSent',
    ] as const

    for (const field of fields) {
      if (body[field as keyof UpdatePostmortemBody] !== undefined) {
        (updates as any)[field] = body[field as keyof UpdatePostmortemBody]
      }
    }

    if (body.publish) updates.publishedAt = new Date()

    const [after] = await db
      .update(postmortems)
      .set(updates)
      .where(eq(postmortems.incidentId, request.params.id))
      .returning()

    await writeAuditLog(request.user.sub, 'postmortem.updated', 'incident', request.params.id, before, after, request)

    return after
  })
}
