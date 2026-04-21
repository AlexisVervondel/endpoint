import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { getDb, onboardingEmployees, onboardingChecklistItems } from '@its/db'
import type { CreateChecklistItemBody, CompleteChecklistItemBody } from '@its/shared'
import { writeAuditLog } from '../services/audit.js'

export const checklistRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/onboarding/employees/:employeeId/checklist
  fastify.get<{ Params: { employeeId: string } }>('/employees/:employeeId/checklist', async (request, reply) => {
    const [emp] = await db
      .select()
      .from(onboardingEmployees)
      .where(eq(onboardingEmployees.id, request.params.employeeId))
    if (!emp) return reply.status(404).send({ error: 'Employee not found' })

    const items = await db
      .select()
      .from(onboardingChecklistItems)
      .where(eq(onboardingChecklistItems.employeeId, emp.id))
      .orderBy(onboardingChecklistItems.category, onboardingChecklistItems.createdAt)

    return items
  })

  // POST /api/onboarding/employees/:employeeId/checklist
  fastify.post<{ Params: { employeeId: string }; Body: CreateChecklistItemBody }>(
    '/employees/:employeeId/checklist',
    {
      schema: {
        body: {
          type: 'object',
          required: ['category', 'title'],
          properties: {
            category: { type: 'string', enum: ['hardware', 'accounts', 'access', 'documentation', 'other'] },
            title: { type: 'string', minLength: 1, maxLength: 255 },
            description: { type: 'string' },
            assignedTo: { type: 'string' },
            dueDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
        },
      },
    },
    async (request, reply) => {
      const [emp] = await db
        .select()
        .from(onboardingEmployees)
        .where(eq(onboardingEmployees.id, request.params.employeeId))
      if (!emp) return reply.status(404).send({ error: 'Employee not found' })

      const body = request.body
      // CRITICAL-2: actor from JWT
      const actorId = request.user.sub

      // HIGH-5: atomic insert + audit
      const item = await db.transaction(async (tx) => {
        const [item] = await tx
          .insert(onboardingChecklistItems)
          .values({
            employeeId: emp.id,
            category: body.category,
            title: body.title,
            description: body.description ?? null,
            assignedTo: body.assignedTo ?? null,
            dueDate: body.dueDate ?? null,
          })
          .returning()

        await writeAuditLog(
          tx as any,
          actorId,
          'checklist_item.created',
          'onboarding_checklist_item',
          item!.id,
          null,
          item,
          request,
        )

        return item!
      })

      return reply.status(201).send(item)
    },
  )

  // POST /api/onboarding/employees/:employeeId/checklist/:itemId/complete
  fastify.post<{ Params: { employeeId: string; itemId: string }; Body: CompleteChecklistItemBody }>(
    '/employees/:employeeId/checklist/:itemId/complete',
    {
      schema: {
        body: {
          type: 'object',
          required: ['completedBy'],
          properties: {
            completedBy: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const [before] = await db
        .select()
        .from(onboardingChecklistItems)
        .where(
          and(
            eq(onboardingChecklistItems.id, request.params.itemId),
            eq(onboardingChecklistItems.employeeId, request.params.employeeId),
          ),
        )
      if (!before) return reply.status(404).send({ error: 'Checklist item not found' })
      if (before.completedAt) return reply.status(409).send({ error: 'Item already completed' })

      // CRITICAL-2: actor from JWT
      const actorId = request.user.sub
      const now = new Date()

      // HIGH-5: atomic update + audit
      const after = await db.transaction(async (tx) => {
        const [after] = await tx
          .update(onboardingChecklistItems)
          .set({ completedAt: now, completedBy: request.body.completedBy })
          .where(eq(onboardingChecklistItems.id, before.id))
          .returning()

        await writeAuditLog(
          tx as any,
          actorId,
          'checklist_item.completed',
          'onboarding_checklist_item',
          before.id,
          before,
          after,
          request,
        )

        return after!
      })

      return after
    },
  )

  // DELETE /api/onboarding/employees/:employeeId/checklist/:itemId
  fastify.delete<{ Params: { employeeId: string; itemId: string } }>(
    '/employees/:employeeId/checklist/:itemId',
    async (request, reply) => {
      const [item] = await db
        .select()
        .from(onboardingChecklistItems)
        .where(
          and(
            eq(onboardingChecklistItems.id, request.params.itemId),
            eq(onboardingChecklistItems.employeeId, request.params.employeeId),
          ),
        )
      if (!item) return reply.status(404).send({ error: 'Checklist item not found' })

      // CRITICAL-2 + HIGH-4: actor from JWT (not hardcoded 'system')
      const actorId = request.user.sub

      // HIGH-5: atomic delete + audit
      await db.transaction(async (tx) => {
        await tx
          .delete(onboardingChecklistItems)
          .where(eq(onboardingChecklistItems.id, item.id))

        await writeAuditLog(
          tx as any,
          actorId,
          'checklist_item.deleted',
          'onboarding_checklist_item',
          item.id,
          item,
          null,
          request,
        )
      })

      return reply.status(204).send()
    },
  )
}
