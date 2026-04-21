export type RequestCategory = 'hardware' | 'software_license' | 'access' | 'infra'
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
export type RequestPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface ItRequest {
  id: string
  title: string
  description: string
  category: RequestCategory
  priority: RequestPriority
  status: RequestStatus
  requesterId: string
  requesterEmail: string
  assigneeId: string | null
  managerId: string | null
  approvedAt: string | null
  approvedBy: string | null
  rejectedAt: string | null
  rejectedBy: string | null
  rejectionReason: string | null
  completedAt: string | null
  slaDueAt: string
  slaBreach: boolean
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface RequestComment {
  id: string
  requestId: string
  authorId: string
  message: string
  isInternal: boolean
  createdAt: string
}

export interface CreateRequestBody {
  title: string
  description: string
  category: RequestCategory
  priority?: RequestPriority
  requesterId: string
  requesterEmail: string
  managerId?: string
  metadata?: Record<string, unknown>
}

export interface UpdateRequestBody {
  title?: string
  description?: string
  priority?: RequestPriority
  assigneeId?: string
  managerId?: string
  metadata?: Record<string, unknown>
}

export interface ApproveRequestBody {
  approvedBy: string
}

export interface RejectRequestBody {
  rejectedBy: string
  rejectionReason: string
}

export interface CompleteRequestBody {
  completedBy: string
}

export interface AddCommentBody {
  authorId: string
  message: string
  isInternal?: boolean
}

export interface RequestStats {
  total: number
  byStatus: Record<RequestStatus, number>
  byCategory: Record<RequestCategory, number>
  slaBreaches: number
  avgResolutionHours: number | null
}

// SLA targets in hours per category (NIS2 / ISO27001 A.12.1.2)
export const REQUEST_SLA_HOURS: Record<RequestCategory, number> = {
  access: 8,
  software_license: 24,
  infra: 48,
  hardware: 72,
}
