import { pgTable, uuid, text, varchar, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { documents } from './documents.js';

export const documentSummaries = pgTable('document_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .references(() => documents.id)
    .unique()
    .notNull(),
  fullText: text('full_text'),
  tldr: text('tldr'),
  detailedSummary: text('detailed_summary'),
  keyTopics: text('key_topics')
    .array()
    .default(sql`'{}'::text[]`)
    .notNull(),
  documentType: varchar('document_type', { length: 100 }),
  dateRange: varchar('date_range', { length: 100 }),
  significance: text('significance'),
  spiceRating: integer('spice_rating'),
  credibilityScore: decimal('credibility_score', { precision: 3, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type DocumentSummary = typeof documentSummaries.$inferSelect;
export type NewDocumentSummary = typeof documentSummaries.$inferInsert;
