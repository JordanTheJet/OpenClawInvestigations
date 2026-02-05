import { createDb, type Database } from '@openclaw/db';

let dbInstance: Database | null = null;

export function getDb(databaseUrl: string): Database {
  if (!dbInstance) {
    dbInstance = createDb(databaseUrl);
  }
  return dbInstance;
}
