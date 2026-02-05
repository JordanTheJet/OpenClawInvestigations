import { createMiddleware } from 'hono/factory';
import type { Env, Variables } from '../types.js';
import { validateApiKey } from '../lib/auth.js';

export const authMiddleware = createMiddleware<{ Bindings: Env; Variables: Variables }>(
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: 'Missing or invalid Authorization header' }, 401);
    }

    const apiKey = authHeader.slice(7);
    const agentId = await validateApiKey(c.var.db, apiKey);

    if (!agentId) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    c.set('agentId', agentId);
    await next();
  }
);
