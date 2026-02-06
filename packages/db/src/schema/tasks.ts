import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { documents } from './documents.js';
import { agents } from './agents.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .references(() => documents.id)
    .notNull(),
  taskType: varchar('task_type', { length: 30 }).notNull(), // 'slice_analysis' or 'full_analysis'
  status: varchar('status', { length: 20 }).default('AVAILABLE').notNull(),
  priority: integer('priority').default(100).notNull(),
  // Slice range (null = full document)
  pageStart: integer('page_start'), // 1-indexed, inclusive
  pageEnd: integer('page_end'),     // 1-indexed, inclusive
  claimedBy: uuid('claimed_by').references(() => agents.id),
  claimExpiresAt: timestamp('claim_expires_at', { withTimezone: true }),
  requiredSubmissions: integer('required_submissions').default(1).notNull(),
  submissionCount: integer('submission_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
