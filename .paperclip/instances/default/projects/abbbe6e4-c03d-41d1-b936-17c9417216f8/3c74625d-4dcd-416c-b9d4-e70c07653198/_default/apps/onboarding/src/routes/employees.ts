import type { FastifyPluginAsync } from 'fastify'
import { eq, desc, count, and } from 'drizzle-orm'
import {
  getDb,
  onboardingEmployees,
  onboardingChecklistItems,
  onboardingDocuments,
  onboardingProvisioningRequests,
} from '@its/db'
import type { CreateEmployeeBody, UpdateEmployeeBody } from '@its/shared'
import { writeAuditLog } from '../services/audit.js'
import { generateProvisioningRequests } from '../services/provisioning.js'

const DEFAULT_CHECKLIST_ITEMS: Array<{
  category: 'hardware' | 'accounts' | 'access' | 'documentation' | 'other'
  title: string
  description: string
}> = [
  { category: 'documentation', title: 'Sign employment contract', description: 'Upload signed contract to the portal' },
  { category: 'documentation', title: 'Submit ID document', description: 'Passport or national ID' },
  { category: 'accounts', title: 'Set up corporate email', description: 'Verify email account is active' },
  { category: 'accounts', title: 'Enroll in MFA', description: 'Configure 2FA on all corporate accounts' },
  { category: 'hardware', title: 'Collect laptop', description: 'Pick up laptop from IT or confirm delivery' },
  { category: 'access', title: 'Accept security policy', description: 'Read and acknowledge the information security policy' },
  { category: 'access', title: 'Complete onboarding training', description: 'Finish mandatory compliance training modules' },
]

export const employeesRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/onboarding/employees
  fastify.get('/employees', async (request) => {
    const { status, department, managerId, limit = '50', offset = '0' } =
      request.query as Record<string, string>

    const rows = await db
      .select()
      .from(onboardingEmployees)
      .where(
        status ? eq(onboardingEmployees.status, status as any) : undefined,
      )
      .orderBy(desc(onboardingEmployees.startDate))
      .limit(Number(limit))
      .offset(Number(offset))

    const enriched = await Promise.all(
      rows.map(async (emp) => {
        const [checklistStats] = await db
          .select({ total: count() })
          .from(onboardingChecklistItems)
          .where(eq(onboardingChecklistItems.employeeId, emp.id))

        const [completedStats] = await db
          .select({ completed: count() })
          .from(onboardingChecklistItems)
          .where(
            and(
              eq(onboardingChecklistItems.employeeId, emp.id),
              // completedAt IS NOT NULL
            ),
          )

        // count completed via isNotNull
        const completedRows = await db
          .select({ count: count() })
          .from(onboardingChecklistItems)
          .where(eq(onboardingChecklistItems.employeeId, emp.id))

        const [docsStats] = await db
          .select({ total: count() })
          .from(onboardingDocuments)
          .where(eq(onboardingDocuments.employeeId, emp.id))

        const [provPending] = await db
          .select({ pending: count() })
          .from(onboardingProvisioningRequests)
          .where(
            and(
              eq(onboardingProvisioningRequests.employeeId, emp.id),
              eq(onboardingProvisioningRequests.status, 'pending'),
            ),
          )

        // Count completed checklist items via raw query on completedAt
        const completedChecklistRows = await db
          .select()
          .from(onboardingChecklistItems)
          .where(eq(onboardingChecklistItems.employeeId, emp.id))

        const checklistCompleted = completedChecklistRows.filter((i) => i.completedAt !== null).length

        return {
          ...emp,
          checklistTotal: checklistStats?.total ?? 0,
          checklistCompleted,
          documentsCount: docsStats?.total ?? 0,
          provisioningPending: provPending?.pending ?? 0,
        }
      }),
    )

    return enriched
  })

  // GET /api/onboarding/employees/:id
  fastify.get<{ Params: { id: string } }>('/employees/:id', async (request, reply) => {
    const [emp] = await db
      .select()
      .from(onboardingEmployees)
      .where(eq(onboardingEmployees.id, request.params.id))
    if (!emp) return reply.status(404).send({ error: 'Employee not found' })

    const [checklist, documents, provisioning] = await Promise.all([
      db
        .select()
        .from(onboardingChecklistItems)
        .where(eq(onboardingChecklistItems.employeeId, emp.id))
        .orderBy(onboardingChecklistItems.category, onboardingChecklistItems.createdAt),
      db
        .select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.employeeId, emp.id))
        .orderBy(desc(onboardingDocuments.createdAt)),
      db
        .select()
        .from(onboardingProvisioningRequests)
        .where(eq(onboardingProvisioningRequests.employeeId, emp.id))
        .orderBy(onboardingProvisioningRequests.requestType),
    ])

    return { ...emp, checklist, documents, provisioning }
  })

  // POST /api/onboarding/employees
  fastify.post<{ Body: CreateEmployeeBody }>('/employees', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'fullName', 'jobTitle', 'department', 'managerId', 'startDate'],
        properties: {
          email: { type: 'string', format: 'email', maxLength: 255 },
          fullName: { type: 'string', minLength: 1, maxLength: 255 },
          jobTitle: { type: 'string', minLength: 1, maxLength: 255 },
          department: { type: 'string', minLength: 1, maxLength: 100 },
          managerId: { type: 'string', minLength: 1, maxLength: 255 },
          startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const body = request.body
    // CRITICAL-2: derive actor from authenticated JWT, not from request body
    const actorId = request.user.sub

    // HIGH-5: wrap create + audit in a single transaction
    const employee = await db.transaction(async (tx) => {
      const [employee] = await tx
        .insert(onboardingEmployees)
        .values({
          email: body.email,
          fullName: body.fullName,
          jobTitle: body.jobTitle,
          department: body.department,
          managerId: body.managerId,
          startDate: body.startDate,
          notes: body.notes ?? null,
          status: 'pending',
        })
        .returning()

      await tx.insert(onboardingChecklistItems).values(
        DEFAULT_CHECKLIST_ITEMS.map((item) => ({
          employeeId: employee!.id,
          category: item.category,
          title: item.title,
          description: item.description,
        })),
      )

      await generateProvisioningRequests(
        { ...employee!, startDate: employee!.startDate as string, notes: employee!.notes, createdAt: employee!.createdAt.toISOString(), updatedAt: employee!.updatedAt.toISOString() },
        body.managerId,
        tx as any,
      )

      await writeAuditLog(
        tx as any,
        actorId,
        'onboarding_employee.created',
        'onboarding_employee',
        employee!.id,
        null,
        employee,
        request,
      )

      return employee!
    })

    return reply.status(201).send(employee)
  })

  // PATCH /api/onboarding/employees/:id — HIGH-2: employee status/data changes restricted to hr_admin or manager
  fastify.patch<{ Params: { id: string }; Body: UpdateEmployeeBody }>('/employees/:id', {
    onRequest: [fastify.requireRole('hr_admin', 'manager')],
    schema: {
      body: {
        type: 'object',
        properties: {
          fullName: { type: 'string', minLength: 1, maxLength: 255 },
          jobTitle: { type: 'string', minLength: 1, maxLength: 255 },
          department: { type: 'string', minLength: 1, maxLength: 100 },
          managerId: { type: 'string', minLength: 1 },
          startDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          status: { type: 'string', enum: ['pending', 'active', 'completed', 'cancelled'] },
          notes: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const [before] = await db
      .select()
      .from(onboardingEmployees)
      .where(eq(onboardingEmployees.id, request.params.id))
    if (!before) return reply.status(404).send({ error: 'Employee not found' })

    const body = request.body
    // CRITICAL-2: derive actor from authenticated JWT, not from stored managerId
    const actorId = request.user.sub
    const updates: Partial<typeof onboardingEmployees.$inferInsert> = {
      updatedAt: new Date(),
    }

    if (body.fullName !== undefined) updates.fullName = body.fullName
    if (body.jobTitle !== undefined) updates.jobTitle = body.jobTitle
    if (body.department !== undefined) updates.department = body.department
    if (body.managerId !== undefined) updates.managerId = body.managerId
    if (body.startDate !== undefined) updates.startDate = body.startDate
    if (body.status !== undefined) updates.status = body.status
    if (body.notes !== undefined) updates.notes = body.notes

    // HIGH-5: wrap update + audit in a single transaction
    const after = await db.transaction(async (tx) => {
      const [after] = await tx
        .update(onboardingEmployees)
        .set(updates)
        .where(eq(onboardingEmployees.id, request.params.id))
        .returning()

      await writeAuditLog(
        tx as any,
        actorId,
        'onboarding_employee.updated',
        'onboarding_employee',
        before.id,
        before,
        after,
        request,
      )

      return after!
    })

    return after
  })
}
