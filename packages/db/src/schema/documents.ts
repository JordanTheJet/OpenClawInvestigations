import { pgTable, uuid, varchar, integer, timestamp, text, boolean } from 'drizzle-orm/pg-core';

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  hash: varchar('hash', { length: 64 }).unique().notNull(),
  source: varchar('source', { length: 50 }).notNull(),
  sourceUrl: text('source_url').notNull(),
  r2Key: varchar('r2_key', { length: 500 }), // Now optional - only set if cached
  fileName: varchar('file_name', { length: 500 }),
  fileType: varchar('file_type', { length: 20 }).notNull(),
  fileSizeBytes: integer('file_size_bytes'),
  pageCount: integer('page_count'), // Fetched lazily
  slicesGenerated: boolean('slices_generated').default(false).notNull(), // Whether slice tasks created
  processingStatus: varchar('processing_status', { length: 20 }).default('discovered').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;
