import { eq } from 'drizzle-orm';
import { agents } from '@openclaw/db';
import type { Database } from '@openclaw/db';

export async function validateApiKey(db: Database, apiKey: string): Promise<string | null> {
  const [agent] = await db.select({ id: agents.id }).from(agents).where(eq(agents.apiKey, apiKey));
  return agent?.id ?? null;
}

export function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = 'oc_';
  for (let i = 0; i < 61; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
