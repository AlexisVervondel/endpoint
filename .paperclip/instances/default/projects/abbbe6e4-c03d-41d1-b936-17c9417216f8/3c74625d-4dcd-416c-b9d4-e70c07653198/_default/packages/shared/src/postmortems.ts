// ISO27001 A.16.1.6 - Learning from incidents
export interface Postmortem {
  id: string
  incidentId: string
  authorId: string
  // What happened
  summary: string
  timeline: string
  rootCause: string
  contributingFactors: string
  // Impact
  impactSummary: string
  affectedUsersCount: number | null
  dataExposed: boolean
  // Resolution
  mitigationSteps: string
  resolutionSteps: string
  // Prevention
  actionItems: PostmortemActionItem[]
  lessonsLearned: string
  // ISO27001 evidence
  evidenceCollected: string
  notificationsSent: string
  createdAt: string
  updatedAt: string
  publishedAt: string | null
}

export interface PostmortemActionItem {
  id: string
  description: string
  owner: string
  dueDate: string | null
  status: 'open' | 'in_progress' | 'done'
}

export interface CreatePostmortemBody {
  authorId: string
  summary: string
  timeline: string
  rootCause: string
  contributingFactors: string
  impactSummary: string
  affectedUsersCount?: number | null
  dataExposed: boolean
  mitigationSteps: string
  resolutionSteps: string
  actionItems?: PostmortemActionItem[]
  lessonsLearned: string
  evidenceCollected: string
  notificationsSent: string
}

export interface UpdatePostmortemBody extends Partial<CreatePostmortemBody> {
  publish?: boolean
}
