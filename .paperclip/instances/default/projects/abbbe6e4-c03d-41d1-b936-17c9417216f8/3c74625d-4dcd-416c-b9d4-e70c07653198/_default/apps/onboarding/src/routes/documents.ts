import type { FastifyPluginAsync } from 'fastify'
import { eq, desc } from 'drizzle-orm'
import { getDb, onboardingEmployees, onboardingDocuments } from '@its/db'
import type { CreateDocumentBody } from '@its/shared'
import { writeAuditLog } from '../services/audit.js'

export const documentsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/onboarding/employees/:employeeId/documents
  fastify.get<{ Params: { employeeId: string } }>(
    '/employees/:employeeId/documents',
    async (request, reply) => {
      const [emp] = await db
        .select()
        .from(onboardingEmployees)
        .where(eq(onboardingEmployees.id, request.params.employeeId))
      if (!emp) return reply.status(404).send({ error: 'Employee not found' })

      const docs = await db
        .select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.employeeId, emp.id))
        .orderBy(desc(onboardingDocuments.createdAt))

      return docs
    },
  )

  // POST /api/onboarding/employees/:employeeId/documents
  // Registers document metadata (actual file upload handled by storage layer separately)
  fastify.post<{ Params: { employeeId: string }; Body: CreateDocumentBody }>(
    '/employees/:employeeId/documents',
    {
      schema: {
        body: {
          type: 'object',
          required: ['documentType', 'fileName', 'mimeType', 'sizeBytes', 'storageKey', 'uploadedBy'],
          properties: {
            documentType: { type: 'string', enum: ['contract', 'id_document', 'policy', 'other'] },
            fileName: { type: 'string', minLength: 1, maxLength: 255 },
            mimeType: { type: 'string', minLength: 1, maxLength: 100 },
            sizeBytes: { type: 'integer', minimum: 1 },
            // HIGH-3: storageKey must follow employees/{employeeId}/{filename} pattern
            storageKey: {
              type: 'string',
              minLength: 1,
              maxLength: 500,
              pattern: '^employees/[a-zA-Z0-9-]+/[a-zA-Z0-9._-]{1,100}$',
            },
            uploadedBy: { type: 'string', minLength: 1 },
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

      // HIGH-3: enforce storageKey is scoped to this employee and contains no path traversal
      const expectedPrefix = `employees/${emp.id}/`
      if (!body.storageKey.startsWith(expectedPrefix)) {
        return reply.status(422).send({ error: 'storageKey must be scoped to this employee' })
      }
      if (body.storageKey.includes('..')) {
        return reply.status(422).send({ error: 'storageKey must not contain path traversal sequences' })
      }

      // CRITICAL-2: actor from JWT
      const actorId = request.user.sub

      // HIGH-5: atomic insert + audit
      const doc = await db.transaction(async (tx) => {
        const [doc] = await tx
          .insert(onboardingDocuments)
          .values({
            employeeId: emp.id,
            documentType: body.documentType,
            fileName: body.fileName,
            mimeType: body.mimeType,
            sizeBytes: body.sizeBytes,
            storageKey: body.storageKey,
            uploadedBy: body.uploadedBy,
          })
          .returning()

        // SOC2 CC6.1 — immutable document record: log upload, no delete route for contracts/id_docs
        await writeAuditLog(
          tx as any,
          actorId,
          'onboarding_document.uploaded',
          'onboarding_document',
          doc!.id,
          null,
          doc,
          request,
        )

        return doc!
      })

      return reply.status(201).send(doc)
    },
  )

  // GET /api/onboarding/employees/:employeeId/documents/:docId
  fastify.get<{ Params: { employeeId: string; docId: string } }>(
    '/employees/:employeeId/documents/:docId',
    async (request, reply) => {
      const [doc] = await db
        .select()
        .from(onboardingDocuments)
        .where(eq(onboardingDocuments.id, request.params.docId))
      if (!doc || doc.employeeId !== request.params.employeeId) {
        return reply.status(404).send({ error: 'Document not found' })
      }
      return doc
    },
  )
}
