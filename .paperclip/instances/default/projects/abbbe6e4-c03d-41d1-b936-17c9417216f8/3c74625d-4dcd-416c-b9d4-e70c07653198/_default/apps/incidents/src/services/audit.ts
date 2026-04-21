import { getDb } from '@its/db'
import { auditLog } from '@its/db'
import type { FastifyRequest } from 'fastify'

// ISO27001 A.12.4.1 - Audit log every mutating action
export async function writeAuditLog(
  actorId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  before: unknown,
  after: unknown,
  request?: FastifyRequest,
) {
  const db = getDb()
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
