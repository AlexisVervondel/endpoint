import type { FastifyPluginAsync } from 'fastify'
import { eq, desc, and, isNotNull } from 'drizzle-orm'
import { getDb, incidents, incidentTimeline } from '@its/db'
import type { CreateIncidentBody, UpdateIncidentBody } from '@its/shared'
import { SLA_THRESHOLDS } from '@its/shared'
import { writeAuditLog } from '../services/audit.js'
import { notifySlack } from '../services/slack.js'
import { isSlaBreached } from '../services/sla.js'

export const incidentsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/incidents
  fastify.get('/', async (request) => {
    const { status, severity, limit = '50', offset = '0' } = request.query as Record<string, string>
    const conditions = []
    if (status) conditions.push(eq(incidents.status, status as any))
    if (severity) conditions.push(eq(incidents.severity, severity as any))

    const rows = await db
      .select()
      .from(incidents)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(incidents.createdAt))
      .limit(Math.min(Math.max(1, Number(limit) || 50), 200))
      .offset(Math.max(0, Number(offset) || 0))

    return rows
  })

  // GET /api/incidents/:id
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    const [row] = await db.select().from(incidents).where(eq(incidents.id, request.params.id))
    if (!row) return reply.status(404).send({ error: 'Incident not found' })
    return row
  })

  // POST /api/incidents
  fastify.post<{ Body: CreateIncidentBody }>('/', {
    schema: {
      body: {
        type: 'object',
        required: ['title', 'description', 'severity', 'commanderId'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string', minLength: 1 },
          severity: { type: 'string', enum: ['SEV1', 'SEV2', 'SEV3', 'SEV4'] },
          commanderId: { type: 'string', minLength: 1 },
          affectedSystems: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body
    const now = new Date()
    const [incident] = await db
      .insert(incidents)
      .values({
        title: body.title,
        description: body.description,
        severity: body.severity,
        commanderId: body.commanderId,
        affectedSystems: body.affectedSystems ?? [],
        status: 'open',
        createdAt: now,
        updatedAt: now,
      })
      .returning()

    // System timeline entry
    await db.insert(incidentTimeline).values({
      incidentId: incident!.id,
      authorId: 'system',
      message: `Incident opened with severity ${incident!.severity}`,
      eventType: 'system',
    })

    await writeAuditLog(request.user.sub, 'incident.created', 'incident', incident!.id, null, incident, request)

    // Slack notify
    await notifySlack('opened', {
      ...incident!,
      affectedSystems: incident!.affectedSystems as string[],
      createdAt: incident!.createdAt.toISOString(),
      updatedAt: incident!.updatedAt.toISOString(),
      acknowledgedAt: incident!.acknowledgedAt?.toISOString() ?? null,
      mitigatedAt: incident!.mitigatedAt?.toISOString() ?? null,
      resolvedAt: incident!.resolvedAt?.toISOString() ?? null,
      closedAt: incident!.closedAt?.toISOString() ?? null,
    })

    return reply.status(201).send(incident)
  })

  // PATCH /api/incidents/:id
  fastify.patch<{ Params: { id: string }; Body: UpdateIncidentBody }>('/:id', {
    schema: {
      body: {
        type: 'object',
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 255 },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['SEV1', 'SEV2', 'SEV3', 'SEV4'] },
          status: { type: 'string', enum: ['open', 'investigating', 'mitigated', 'resolved', 'closed'] },
          commanderId: { type: 'string' },
          affectedSystems: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  }, async (request, reply) => {
    const [before] = await db.select().from(incidents).where(eq(incidents.id, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Incident not found' })

    const body = request.body
    const now = new Date()
    const updates: Partial<typeof incidents.$inferInsert> = { updatedAt: now }

    if (body.title !== undefined) updates.title = body.title
    if (body.description !== undefined) updates.description = body.description
    if (body.commanderId !== undefined) updates.commanderId = body.commanderId
    if (body.affectedSystems !== undefined) updates.affectedSystems = body.affectedSystems

    // Status transitions with timestamps
    if (body.status && body.status !== before.status) {
      updates.status = body.status
      if (body.status === 'investigating' && !before.acknowledgedAt) updates.acknowledgedAt = now
      if (body.status === 'mitigated') updates.mitigatedAt = now
      if (body.status === 'resolved') {
        updates.resolvedAt = now
        updates.slaBreach = isSlaBreached(before.severity, before.createdAt, now)
      }
      if (body.status === 'closed') updates.closedAt = now

      // Timeline entry for status change
      await db.insert(incidentTimeline).values({
        incidentId: before.id,
        authorId: 'system',
        message: `Status changed from ${before.status} to ${body.status}`,
        eventType: 'status_change',
        metadata: { from: before.status, to: body.status },
      })
    }

    if (body.severity && body.severity !== before.severity) {
      updates.severity = body.severity
      await db.insert(incidentTimeline).values({
        incidentId: before.id,
        authorId: 'system',
        message: `Severity changed from ${before.severity} to ${body.severity}`,
        eventType: 'severity_change',
        metadata: { from: before.severity, to: body.severity },
      })
    }

    const [after] = await db
      .update(incidents)
      .set(updates)
      .where(eq(incidents.id, request.params.id))
      .returning()

    await writeAuditLog(request.user.sub, 'incident.updated', 'incident', before.id, before, after, request)

    // Slack notify on close/escalation
    if (body.status === 'closed') {
      await notifySlack('closed', {
        ...after!,
        affectedSystems: after!.affectedSystems as string[],
        createdAt: after!.createdAt.toISOString(),
        updatedAt: after!.updatedAt.toISOString(),
        acknowledgedAt: after!.acknowledgedAt?.toISOString() ?? null,
        mitigatedAt: after!.mitigatedAt?.toISOString() ?? null,
        resolvedAt: after!.resolvedAt?.toISOString() ?? null,
        closedAt: after!.closedAt?.toISOString() ?? null,
      })
    }

    if (body.severity && ['SEV1', 'SEV2'].includes(body.severity) && !['SEV1', 'SEV2'].includes(before.severity)) {
      await notifySlack('escalated', {
        ...after!,
        affectedSystems: after!.affectedSystems as string[],
        createdAt: after!.createdAt.toISOString(),
        updatedAt: after!.updatedAt.toISOString(),
        acknowledgedAt: after!.acknowledgedAt?.toISOString() ?? null,
        mitigatedAt: after!.mitigatedAt?.toISOString() ?? null,
        resolvedAt: after!.resolvedAt?.toISOString() ?? null,
        closedAt: after!.closedAt?.toISOString() ?? null,
      })
    }

    return after
  })

  // DELETE (soft close) not needed - incidents are never deleted (ISO27001 evidence retention)
}
