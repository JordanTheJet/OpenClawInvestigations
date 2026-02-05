import { pgTable, uuid, varchar, text, jsonb, decimal, integer, timestamp, unique } from 'drizzle-orm/pg-core';
import { tasks } from './tasks.js';
import { agents } from './agents.js';

export const taskSubmissions = pgTable(
  'task_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    taskId: uuid('task_id')
      .references(() => tasks.id)
      .notNull(),
    agentId: uuid('agent_id')
      .references(() => agents.id)
      .notNull(),
    fullText: text('full_text'),
    entities: jsonb('entities').$type<unknown[]>().default([]).notNull(),
    relationships: jsonb('relationships').$type<unknown[]>().default([]).notNull(),
    summary: jsonb('summary').$type<Record<string, unknown>>(),
    credibilityScore: decimal('credibility_score', { precision: 3, scale: 2 }),
    spiceRating: integer('spice_rating'),
    processingMetadata: jsonb('processing_metadata').$type<Record<string, unknown>>(),
    validationStatus: varchar('validation_status', { length: 20 }).default('pending').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueTaskAgent: unique().on(table.taskId, table.agentId),
  })
);

export type TaskSubmission = typeof taskSubmissions.$inferSelect;
export type NewTaskSubmission = typeof taskSubmissions.$inferInsert;
