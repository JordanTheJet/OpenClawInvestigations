import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { agents } from '@openclaw/db';
import { agentRegistrationSchema } from '@openclaw/shared';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateApiKey } from '../lib/auth.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// POST /api/v1/agents/register - Register new agent
app.post('/register', async (c) => {
  const db = c.var.db;
  const body = await c.req.json();

  const parsed = agentRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request body', details: parsed.error.issues }, 400);
  }

  const apiKey = generateApiKey();

  const [newAgent] = await db
    .insert(agents)
    .values({
      apiKey,
      name: parsed.data.name || null,
    })
    .returning({
      id: agents.id,
      name: agents.name,
    });

  return c.json({
    id: newAgent!.id,
    apiKey,
    name: newAgent!.name,
  }, 201);
});

// GET /api/v1/agents/me/stats - Get authenticated agent's stats
app.get('/me/stats', authMiddleware, async (c) => {
  const db = c.var.db;
  const agentId = c.var.agentId!;

  const [agent] = await db
    .select({
      id: agents.id,
      name: agents.name,
      tasksCompleted: agents.tasksCompleted,
      pointsBalance: agents.pointsBalance,
      consensusRate: agents.consensusRate,
    })
    .from(agents)
    .where(eq(agents.id, agentId));

  if (!agent) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  // Calculate rank
  const [rankResult] = await db
    .select({
      rank: sql<number>`(
        SELECT COUNT(*) + 1
        FROM ${agents}
        WHERE ${agents.pointsBalance} > ${agent.pointsBalance}
      )`,
    })
    .from(agents)
    .where(eq(agents.id, agentId));

  return c.json({
    id: agent.id,
    name: agent.name,
    tasksCompleted: agent.tasksCompleted,
    pointsBalance: agent.pointsBalance,
    consensusRate: parseFloat(agent.consensusRate),
    rank: rankResult?.rank || 1,
  });
});

export default app;
