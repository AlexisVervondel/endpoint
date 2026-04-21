import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  pgEnum,
  jsonb,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const requestCategoryEnum = pgEnum('request_category', [
  'hardware',
  'software_license',
  'access',
  'infra',
])

export const requestStatusEnum = pgEnum('request_status', [
  'pending',
  'approved',
  'rejected',
  'in_progress',
  'completed',
  'cancelled',
])

export const requestPriorityEnum = pgEnum('request_priority', ['low', 'medium', 'high', 'urgent'])

export const itRequests = pgTable('it_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').notNull(),
  category: requestCategoryEnum('category').notNull(),
  priority: requestPriorityEnum('priority').notNull().default('medium'),
  status: requestStatusEnum('status').notNull().default('pending'),
  requesterId: varchar('requester_id', { length: 255 }).notNull(),
  requesterEmail: varchar('requester_email', { length: 255 }).notNull(),
  assigneeId: varchar('assignee_id', { length: 255 }),
  managerId: varchar('manager_id', { length: 255 }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  approvedBy: varchar('approved_by', { length: 255 }),
  rejectedAt: timestamp('rejected_at', { withTimezone: true }),
  rejectedBy: varchar('rejected_by', { length: 255 }),
  rejectionReason: text('rejection_reason'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  slaDueAt: timestamp('sla_due_at', { withTimezone: true }).notNull(),
  slaBreach: boolean('sla_breach').notNull().default(false),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const requestComments = pgTable('request_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  requestId: uuid('request_id')
    .notNull()
    .references(() => itRequests.id, { onDelete: 'cascade' }),
  authorId: varchar('author_id', { length: 255 }).notNull(),
  message: text('message').notNull(),
  isInternal: boolean('is_internal').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const itRequestRelations = relations(itRequests, ({ many }) => ({
  comments: many(requestComments),
}))

export const requestCommentRelations = relations(requestComments, ({ one }) => ({
  request: one(itRequests, {
    fields: [requestComments.requestId],
    references: [itRequests.id],
  }),
}))
