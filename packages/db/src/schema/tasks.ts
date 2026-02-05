import { pgTable, uuid, varchar, integer, timestamp } from 'drizzle-orm/pg-core';
import { documents } from './documents.js';
import { agents } from './agents.js';

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .references(() => documents.id)
    .notNull(),
  taskType: varchar('task_type', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).default('AVAILABLE').notNull(),
  priority: integer('priority').default(100).notNull(),
  claimedBy: uuid('claimed_by').references(() => agents.id),
  claimExpiresAt: timestamp('claim_expires_at', { withTimezone: true }),
  requiredSubmissions: integer('required_submissions').default(2).notNull(),
  submissionCount: integer('submission_count').default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
