import { pgTable, uuid, varchar, integer, decimal, timestamp } from 'drizzle-orm/pg-core';

export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  apiKey: varchar('api_key', { length: 64 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  tasksCompleted: integer('tasks_completed').default(0).notNull(),
  pointsBalance: integer('points_balance').default(0).notNull(),
  consensusRate: decimal('consensus_rate', { precision: 5, scale: 4 }).default('0').notNull(),
  status: varchar('status', { length: 20 }).default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
