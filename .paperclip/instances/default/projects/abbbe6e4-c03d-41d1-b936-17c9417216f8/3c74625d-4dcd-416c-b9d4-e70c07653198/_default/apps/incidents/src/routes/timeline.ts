import type { FastifyPluginAsync } from 'fastify'
import { eq, asc } from 'drizzle-orm'
import { getDb, incidents, incidentTimeline } from '@its/db'
import type { AddTimelineEntryBody } from '@its/shared'
import { writeAuditLog } from '../services/audit.js'

export const timelineRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/incidents/:id/timeline
  fastify.get<{ Params: { id: string } }>('/:id/timeline', async (request, reply) => {
    const [incident] = await db.select({ id: incidents.id }).from(incidents).where(eq(incidents.id, request.params.id))
    if (!incident) return reply.status(404).send({ error: 'Incident not found' })

    const entries = await db
      .select()
      .from(incidentTimeline)
      .where(eq(incidentTimeline.incidentId, request.params.id))
      .orderBy(asc(incidentTimeline.createdAt))

    return entries
  })

  // POST /api/incidents/:id/timeline
  fastify.post<{ Params: { id: string }; Body: AddTimelineEntryBody }>('/:id/timeline', {
    schema: {
      body: {
        type: 'object',
        required: ['message'],
        properties: {
          message: { type: 'string', minLength: 1, maxLength: 5000 },
          eventType: {
            type: 'string',
            enum: ['comment', 'status_change', 'severity_change', 'escalation', 'system'],
          },
        },
      },
    },
  }, async (request, reply) => {
    const [incident] = await db.select({ id: incidents.id }).from(incidents).where(eq(incidents.id, request.params.id))
    if (!incident) return reply.status(404).send({ error: 'Incident not found' })

    // authorId is always the authenticated caller — never client-supplied
    const authorId = request.user.sub

    const [entry] = await db
      .insert(incidentTimeline)
      .values({
        incidentId: request.params.id,
        authorId,
        message: request.body.message,
        eventType: request.body.eventType ?? 'comment',
      })
      .returning()

    await writeAuditLog(authorId, 'timeline.entry_added', 'incident', request.params.id, null, entry, request)

    return reply.status(201).send(entry)
  })
}
