import type { FastifyPluginAsync } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { getDb, onboardingEmployees, onboardingProvisioningRequests } from '@its/db'
import type { CreateProvisioningRequestBody, UpdateProvisioningRequestBody } from '@its/shared'
import { writeAuditLog } from '../services/audit.js'

export const provisioningRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/onboarding/employees/:employeeId/provisioning
  fastify.get<{ Params: { employeeId: string } }>(
    '/employees/:employeeId/provisioning',
    async (request, reply) => {
      const [emp] = await db
        .select()
        .from(onboardingEmployees)
        .where(eq(onboardingEmployees.id, request.params.employeeId))
      if (!emp) return reply.status(404).send({ error: 'Employee not found' })

      const requests = await db
        .select()
        .from(onboardingProvisioningRequests)
        .where(eq(onboardingProvisioningRequests.employeeId, emp.id))
        .orderBy(onboardingProvisioningRequests.requestType)

      return requests
    },
  )

  // POST /api/onboarding/employees/:employeeId/provisioning
  fastify.post<{ Params: { employeeId: string }; Body: CreateProvisioningRequestBody }>(
    '/employees/:employeeId/provisioning',
    {
      schema: {
        body: {
          type: 'object',
          required: ['requestType', 'title', 'requestedBy'],
          properties: {
            requestType: {
              type: 'string',
              enum: ['hardware', 'software', 'network_access', 'email_account', 'other'],
            },
            title: { type: 'string', minLength: 1, maxLength: 255 },
            details: { type: 'object' },
            assignedTo: { type: 'string' },
            requestedBy: { type: 'string', minLength: 1 },
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
      const req = await db.transaction(async (tx) => {
        const [req] = await tx
          .insert(onboardingProvisioningRequests)
          .values({
            employeeId: emp.id,
            requestType: body.requestType,
            title: body.title,
            details: body.details ?? null,
            assignedTo: body.assignedTo ?? null,
            requestedBy: body.requestedBy,
            status: 'pending',
          })
          .returning()

        await writeAuditLog(
          tx as any,
          actorId,
          'provisioning_request.created',
          'onboarding_provisioning_request',
          req!.id,
          null,
          req,
          request,
        )

        return req!
      })

      return reply.status(201).send(req)
    },
  )

  // PATCH /api/onboarding/employees/:employeeId/provisioning/:reqId — HIGH-1: approval restricted to it_admin
  fastify.patch<{
    Params: { employeeId: string; reqId: string }
    Body: UpdateProvisioningRequestBody
  }>(
    '/employees/:employeeId/provisioning/:reqId',
    {
      onRequest: [fastify.requireRole('it_admin')],
      schema: {
        body: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['pending', 'approved', 'in_progress', 'done', 'rejected'],
            },
            assignedTo: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const [before] = await db
        .select()
        .from(onboardingProvisioningRequests)
        .where(
          and(
            eq(onboardingProvisioningRequests.id, request.params.reqId),
            eq(onboardingProvisioningRequests.employeeId, request.params.employeeId),
          ),
        )
      if (!before) return reply.status(404).send({ error: 'Provisioning request not found' })

      const body = request.body
      // CRITICAL-2: actor from JWT
      const actorId = request.user.sub
      const updates: Partial<typeof onboardingProvisioningRequests.$inferInsert> = {
        updatedAt: new Date(),
      }

      if (body.status !== undefined) updates.status = body.status
      if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo

      // HIGH-5: atomic update + audit
      const after = await db.transaction(async (tx) => {
        const [after] = await tx
          .update(onboardingProvisioningRequests)
          .set(updates)
          .where(eq(onboardingProvisioningRequests.id, before.id))
          .returning()

        await writeAuditLog(
          tx as any,
          actorId,
          'provisioning_request.updated',
          'onboarding_provisioning_request',
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
}
