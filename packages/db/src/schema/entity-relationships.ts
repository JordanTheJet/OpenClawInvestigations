import { pgTable, uuid, varchar, text, decimal, timestamp, index } from 'drizzle-orm/pg-core';
import { entities } from './entities.js';
import { documents } from './documents.js';

export const entityRelationships = pgTable(
  'entity_relationships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceEntityId: uuid('source_entity_id')
      .references(() => entities.id)
      .notNull(),
    targetEntityId: uuid('target_entity_id')
      .references(() => entities.id)
      .notNull(),
    relationshipType: varchar('relationship_type', { length: 30 }).notNull(),
    confidence: decimal('confidence', { precision: 3, scale: 2 }).notNull(),
    evidenceText: text('evidence_text').notNull(),
    documentId: uuid('document_id')
      .references(() => documents.id)
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    sourceEntityIdx: index('entity_relationships_source_idx').on(table.sourceEntityId),
    targetEntityIdx: index('entity_relationships_target_idx').on(table.targetEntityId),
    relationshipTypeIdx: index('entity_relationships_type_idx').on(table.relationshipType),
  })
);

export type EntityRelationship = typeof entityRelationships.$inferSelect;
export type NewEntityRelationship = typeof entityRelationships.$inferInsert;
