import { auditLog } from '@its/db'
import type { Db } from '@its/db'
import type { FastifyRequest } from 'fastify'

// ISO27001 A.12.4.1 / NIS2 Art.21 — audit every mutating action on onboarding resources
// HIGH-5: caller must pass the active db or transaction so audit write is atomic with the mutation
export async function writeAuditLog(
  db: Db,
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  before: unknown,
  after: unknown,
  request?: FastifyRequest,
) {
  await db.insert(auditLog).values({
    actorId,
    action,
    resourceType,
    resourceId,
    before: before as Record<string, unknown>,
    after: after as Record<string, unknown>,
    ipAddress: request?.ip ?? null,
    userAgent: request?.headers['user-agent'] ?? null,
  })
}
