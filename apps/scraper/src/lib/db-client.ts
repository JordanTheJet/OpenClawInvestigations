import { createDb } from '@openclaw/db';

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  return createDb(databaseUrl);
}
