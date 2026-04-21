import type { IncidentSeverity } from './incidents'

export interface MttrReport {
  periodStart: string
  periodEnd: string
  totalIncidents: number
  resolvedIncidents: number
  averageMttrMinutes: number
  byseverity: Record<IncidentSeverity, { count: number; avgMttrMinutes: number }>
}

export interface SlaReport {
  periodStart: string
  periodEnd: string
  totalIncidents: number
  slaBreached: number
  slaMetPercentage: number
  byseverity: Record<
    IncidentSeverity,
    { total: number; breached: number; metPercentage: number; slaThresholdMinutes: number }
  >
}
