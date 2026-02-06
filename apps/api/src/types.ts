import type { Database } from '@openclaw/db';

export interface Env {
  DATABASE_URL: string;
  DOCUMENTS_BUCKET: R2Bucket;
  DOCUMENT_QUEUE?: Queue<unknown>;
  R2_PUBLIC_URL?: string;
  ENVIRONMENT: string;
  SLICE_SIZE?: string;
}

export interface Variables {
  db: Database;
  agentId?: string;
}
