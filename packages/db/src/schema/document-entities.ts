import { pgTable, uuid, varchar, decimal, jsonb, timestamp, primaryKey } from 'drizzle-orm/pg-core';
import { documents } from './documents.js';
import { entities } from './entities.js';

export const documentEntities = pgTable(
  'document_entities',
  {
    documentId: uuid('document_id')
      .references(() => documents.id)
      .notNull(),
    entityId: uuid('entity_id')
      .references(() => entities.id)
      .notNull(),
    role: varchar('role', { length: 255 }),
    confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
    spans: jsonb('spans').$type<Array<{ start: number; end: number }>>().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.documentId, table.entityId] }),
  })
);

export type DocumentEntity = typeof documentEntities.$inferSelect;
export type NewDocumentEntity = typeof documentEntities.$inferInsert;
