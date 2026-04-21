import type { FastifyPluginAsync } from 'fastify'
import { and, gte, lte, isNotNull, eq } from 'drizzle-orm'
import { getDb, incidents } from '@its/db'
import { SLA_THRESHOLDS } from '@its/shared'
import type { IncidentSeverity, MttrReport, SlaReport } from '@its/shared'

const SEVERITIES: IncidentSeverity[] = ['SEV1', 'SEV2', 'SEV3', 'SEV4']

export const reportsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  const MAX_PERIOD_MS = 366 * 24 * 60 * 60 * 1000 // 1 year max

  function parsePeriod(query: Record<string, string>) {
    const end = query['periodEnd'] ? new Date(query['periodEnd']) : new Date()
    if (isNaN(end.getTime())) throw new Error('Invalid periodEnd date')

    const defaultStart = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000)
    const start = query['periodStart'] ? new Date(query['periodStart']) : defaultStart
    if (isNaN(start.getTime())) throw new Error('Invalid periodStart date')
    if (start >= end) throw new Error('periodStart must be before periodEnd')

    // Cap range to prevent DB exhaustion on unbounded queries
    const clampedStart = new Date(Math.max(start.getTime(), end.getTime() - MAX_PERIOD_MS))
    return { start: clampedStart, end }
  }

  // GET /api/reports/mttr
  fastify.get('/mttr', async (request, reply) => {
    let start: Date, end: Date
    try {
      ;({ start, end } = parsePeriod(request.query as Record<string, string>))
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message })
    }

    const rows = await db
      .select()
      .from(incidents)
      .where(
        and(
          gte(incidents.createdAt, start),
          lte(incidents.createdAt, end),
          isNotNull(incidents.resolvedAt),
        ),
      )

    const byseverity = Object.fromEntries(
      SEVERITIES.map((s) => [s, { count: 0, avgMttrMinutes: 0 }]),
    ) as MttrReport['byseverity']

    let totalMttrMs = 0
    for (const row of rows) {
      if (!row.resolvedAt) continue
      const mttrMs = row.resolvedAt.getTime() - row.createdAt.getTime()
      totalMttrMs += mttrMs
      byseverity[row.severity].count++
      byseverity[row.severity].avgMttrMinutes += mttrMs / 60_000
    }

    for (const s of SEVERITIES) {
      if (byseverity[s].count > 0) {
        byseverity[s].avgMttrMinutes = Math.round(byseverity[s].avgMttrMinutes / byseverity[s].count)
      }
    }

    const report: MttrReport = {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      totalIncidents: rows.length,
      resolvedIncidents: rows.length,
      averageMttrMinutes: rows.length > 0 ? Math.round(totalMttrMs / rows.length / 60_000) : 0,
      byseverity,
    }

    return report
  })

  // GET /api/reports/sla
  fastify.get('/sla', async (request, reply) => {
    let start: Date, end: Date
    try {
      ;({ start, end } = parsePeriod(request.query as Record<string, string>))
    } catch (err) {
      return reply.status(400).send({ error: (err as Error).message })
    }

    const rows = await db
      .select()
      .from(incidents)
      .where(and(gte(incidents.createdAt, start), lte(incidents.createdAt, end)))

    const byseverity = Object.fromEntries(
      SEVERITIES.map((s) => [
        s,
        {
          total: 0,
          breached: 0,
          metPercentage: 100,
          slaThresholdMinutes: SLA_THRESHOLDS[s],
        },
      ]),
    ) as SlaReport['byseverity']

    let totalBreached = 0
    for (const row of rows) {
      byseverity[row.severity].total++
      if (row.slaBreach) {
        byseverity[row.severity].breached++
        totalBreached++
      }
    }

    for (const s of SEVERITIES) {
      const { total, breached } = byseverity[s]
      byseverity[s].metPercentage = total > 0 ? Math.round(((total - breached) / total) * 100) : 100
    }

    const report: SlaReport = {
      periodStart: start.toISOString(),
      periodEnd: end.toISOString(),
      totalIncidents: rows.length,
      slaBreached: totalBreached,
      slaMetPercentage: rows.length > 0 ? Math.round(((rows.length - totalBreached) / rows.length) * 100) : 100,
      byseverity,
    }

    return report
  })
}
