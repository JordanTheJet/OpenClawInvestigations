import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types.js';
import { getDb } from '../lib/db.js';

export const dbMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const db = getDb(c.env.DATABASE_URL);
    c.set('db', db);
    await next();
  }
);
