import type { RequestCategory } from '@its/shared'
import { REQUEST_SLA_HOURS } from '@its/shared'

export function computeSlaDue(category: RequestCategory, from: Date): Date {
  const due = new Date(from)
  due.setHours(due.getHours() + REQUEST_SLA_HOURS[category])
  return due
}

export function isSlaBreached(category: RequestCategory, createdAt: Date, resolvedAt: Date): boolean {
  const slaMs = REQUEST_SLA_HOURS[category] * 60 * 60 * 1000
  return resolvedAt.getTime() - createdAt.getTime() > slaMs
}
