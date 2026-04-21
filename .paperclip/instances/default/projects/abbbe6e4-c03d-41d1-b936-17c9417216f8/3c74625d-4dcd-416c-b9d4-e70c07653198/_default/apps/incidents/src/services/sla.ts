import { SLA_THRESHOLDS } from '@its/shared'
import type { IncidentSeverity } from '@its/shared'
import { getDb, incidents } from '@its/db'
import { lt, and, isNull, eq } from 'drizzle-orm'

// Check and mark SLA breaches. Run periodically (e.g. via cron or on each read).
export function isSlaBreached(severity: IncidentSeverity, createdAt: Date, resolvedAt: Date | null): boolean {
  const thresholdMs = SLA_THRESHOLDS[severity] * 60 * 1000
  const deadline = new Date(createdAt.getTime() + thresholdMs)
  const compareTime = resolvedAt ?? new Date()
  return compareTime > deadline
}

export async function markSlaBreaches() {
  const db = getDb()
  const now = new Date()

  // Find open incidents past their SLA threshold
  const openIncidents = await db
    .select()
    .from(incidents)
    .where(and(isNull(incidents.resolvedAt), eq(incidents.slaBreach, false)))

  for (const incident of openIncidents) {
    if (isSlaBreached(incident.severity, incident.createdAt, null)) {
      await db
        .update(incidents)
        .set({ slaBreach: true, updatedAt: now })
        .where(eq(incidents.id, incident.id))
    }
  }
}
