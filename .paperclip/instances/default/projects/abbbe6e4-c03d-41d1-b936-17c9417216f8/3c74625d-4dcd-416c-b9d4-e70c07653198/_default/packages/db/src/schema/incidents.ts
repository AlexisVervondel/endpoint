import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
  integer,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const severityEnum = pgEnum('incident_severity', ['SEV1', 'SEV2', 'SEV3', 'SEV4'])
export const incidentStatusEnum = pgEnum('incident_status', [
  'open',
  'investigating',
  'mitigated',
  'resolved',
  'closed',
])
export const timelineEventTypeEnum = pgEnum('timeline_event_type', [
  'comment',
  'status_change',
  'severity_change',
  'escalation',
  'system',
])

export const incidents = pgTable('incidents', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  severity: severityEnum('severity').notNull(),
  status: incidentStatusEnum('status').notNull().default('open'),
  commanderId: varchar('commander_id', { length: 255 }).notNull(),
  affectedSystems: jsonb('affected_systems').$type<string[]>().notNull().default([]),
  slaBreach: boolean('sla_breach').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
  mitigatedAt: timestamp('mitigated_at', { withTimezone: true }),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  closedAt: timestamp('closed_at', { withTimezone: true }),
})

export const incidentTimeline = pgTable('incident_timeline', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 255 }).notNull(),
  message: text('message').notNull(),
  eventType: timelineEventTypeEnum('event_type').notNull().default('comment'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const postmortems = pgTable('postmortems', {
  id: uuid('id').defaultRandom().primaryKey(),
  incidentId: uuid('incident_id')
    .notNull()
    .unique()
    .references(() => incidents.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 255 }).notNull(),
  summary: text('summary').notNull(),
  timeline: text('timeline').notNull(),
  rootCause: text('root_cause').notNull(),
  contributingFactors: text('contributing_factors').notNull(),
  impactSummary: text('impact_summary').notNull(),
  affectedUsersCount: integer('affected_users_count'),
  dataExposed: boolean('data_exposed').notNull().default(false),
  mitigationSteps: text('mitigation_steps').notNull(),
  resolutionSteps: text('resolution_steps').notNull(),
  actionItems: jsonb('action_items').$type<
    Array<{
      id: string
      description: string
      owner: string
      dueDate: string | null
      status: 'open' | 'in_progress' | 'done'
    }>
  >().notNull().default([]),
  lessonsLearned: text('lessons_learned').notNull(),
  evidenceCollected: text('evidence_collected').notNull(),
  notificationsSent: text('notifications_sent').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
})

// ISO27001 A.12.4 - Audit logging
export const auditLog = pgTable('audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: varchar('actor_id', { length: 255 }).notNull(),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 50 }).notNull(),
  resourceId: uuid('resource_id').notNull(),
  before: jsonb('before'),
  after: jsonb('after'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const incidentRelations = relations(incidents, ({ many, one }) => ({
  timeline: many(incidentTimeline),
  postmortem: one(postmortems, {
    fields: [incidents.id],
    references: [postmortems.incidentId],
  }),
}))

export const timelineRelations = relations(incidentTimeline, ({ one }) => ({
  incident: one(incidents, {
    fields: [incidentTimeline.incidentId],
    references: [incidents.id],
  }),
}))

export const postmortemRelations = relations(postmortems, ({ one }) => ({
  incident: one(incidents, {
    fields: [postmortems.incidentId],
    references: [incidents.id],
  }),
}))
