import type { FastifyPluginAsync } from 'fastify'
import { sql, eq } from 'drizzle-orm'
import { getDb, itRequests } from '@its/db'
import type { RequestStats } from '@its/shared'

export const statsRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb()

  // GET /api/requests/stats
  fastify.get('/stats', async () => {
    const rows = await db.select().from(itRequests)

    const byStatus = rows.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const byCategory = rows.reduce(
      (acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    const slaBreaches = rows.filter((r) => r.slaBreach).length

    const completed = rows.filter((r) => r.status === 'completed' && r.completedAt)
    const avgResolutionHours =
      completed.length > 0
        ? completed.reduce((sum, r) => {
            const ms = r.completedAt!.getTime() - r.createdAt.getTime()
            return sum + ms / (1000 * 60 * 60)
          }, 0) / completed.length
        : null

    return {
      total: rows.length,
      byStatus,
      byCategory,
      slaBreaches,
      avgResolutionHours: avgResolutionHours !== null ? Math.round(avgResolutionHours * 10) / 10 : null,
    } satisfies RequestStats
  })
}
