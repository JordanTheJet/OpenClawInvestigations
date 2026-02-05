import { pgTable, uuid, varchar, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const entities = pgTable(
  'entities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    canonicalName: varchar('canonical_name', { length: 500 }).notNull(),
    entityType: varchar('entity_type', { length: 30 }).notNull(),
    aliases: text('aliases')
      .array()
      .default(sql`'{}'::text[]`)
      .notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    canonicalNameIdx: index('entities_canonical_name_idx').on(table.canonicalName),
    entityTypeIdx: index('entities_entity_type_idx').on(table.entityType),
  })
);

export type Entity = typeof entities.$inferSelect;
export type NewEntity = typeof entities.$inferInsert;
