export type IncidentSeverity = 'SEV1' | 'SEV2' | 'SEV3' | 'SEV4'
export type IncidentStatus = 'open' | 'investigating' | 'mitigated' | 'resolved' | 'closed'

export interface Incident {
  id: string
  title: string
  description: string
  severity: IncidentSeverity
  status: IncidentStatus
  commanderId: string
  affectedSystems: string[]
  createdAt: string
  updatedAt: string
  acknowledgedAt: string | null
  mitigatedAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  slaBreach: boolean
}

export interface IncidentTimeline {
  id: string
  incidentId: string
  authorId: string
  message: string
  eventType: 'comment' | 'status_change' | 'severity_change' | 'escalation' | 'system'
  metadata: Record<string, unknown> | null
  createdAt: string
}

export interface CreateIncidentBody {
  title: string
  description: string
  severity: IncidentSeverity
  commanderId: string
  affectedSystems: string[]
}

export interface UpdateIncidentBody {
  title?: string
  description?: string
  severity?: IncidentSeverity
  status?: IncidentStatus
  commanderId?: string
  affectedSystems?: string[]
}

export interface AddTimelineEntryBody {
  message: string
  eventType?: IncidentTimeline['eventType']
}

// SLA thresholds in minutes per severity (ISO27001 A.16.1.5)
export const SLA_THRESHOLDS: Record<IncidentSeverity, number> = {
  SEV1: 60,    // 1 hour to resolve
  SEV2: 240,   // 4 hours
  SEV3: 1440,  // 24 hours
  SEV4: 4320,  // 72 hours
}
