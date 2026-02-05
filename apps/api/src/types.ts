import type { Database } from '@openclaw/db';

export interface Env {
  DATABASE_URL: string;
  DOCUMENTS_BUCKET: R2Bucket;
  R2_PUBLIC_URL?: string;
  ENVIRONMENT: string;
}

export interface Variables {
  db: Database;
  agentId?: string;
}
