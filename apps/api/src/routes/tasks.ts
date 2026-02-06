import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { tasks } from '@openclaw/db';
import { submitTaskRequestSchema } from '@openclaw/shared';
import type { Env, Variables } from '../types.js';
import { authMiddleware } from '../middleware/auth.js';
import { claimNextTask, extendClaim, submitTask, releaseTask } from '../services/task-queue.js';
import { validateAndMerge } from '../services/consensus.js';
import { processSubmissionEntities } from '../services/entity-resolution.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// All task routes require authentication
app.use('/*', authMiddleware);

// GET /api/v1/tasks/next - Claim next available task
app.get('/next', async (c) => {
  const db = c.var.db;
  const agentId = c.var.agentId!;
  const sliceSize = parseInt(c.env.SLICE_SIZE || '25');

  const result = await claimNextTask(db, agentId, sliceSize);

  if (!result) {
    return c.json({ error: 'No tasks available' }, 404);
  }

  // Return task with source URL for on-demand fetching
  return c.json({
    task: {
      id: result.task.id,
      documentId: result.task.documentId,
      taskType: result.task.taskType,
      pageStart: result.task.pageStart,
      pageEnd: result.task.pageEnd,
      document: result.task.document,
      // Source URL for direct fetching (no R2 storage)
      sourceUrl: result.task.document.sourceUrl,
    },
    claimExpiresAt: result.claimExpiresAt.toISOString(),
  });
});

// POST /api/v1/tasks/:id/submit - Submit task results
app.post('/:id/submit', async (c) => {
  const db = c.var.db;
  const agentId = c.var.agentId!;
  const taskId = c.req.param('id');
  const body = await c.req.json();

  const parsed = submitTaskRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid submission', details: parsed.error.issues }, 400);
  }

  try {
    const result = await submitTask(db, taskId, agentId, {
      fullText: parsed.data.submission.fullText,
      entities: parsed.data.submission.entities,
      relationships: parsed.data.submission.relationships,
      summary: parsed.data.submission.summary,
      credibilityScore: parsed.data.submission.credibilityScore,
      spiceRating: parsed.data.submission.spiceRating,
      processingMetadata: parsed.data.submission.processingMetadata,
    });

    // Get task to check if we should run consensus
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (task?.status === 'SUBMITTED') {
      // Run consensus validation asynchronously
      validateAndMerge(db, taskId).catch(console.error);

      // Process entities (also async)
      processSubmissionEntities(
        db,
        task.documentId,
        parsed.data.submission.entities,
        parsed.data.submission.relationships.map((r) => ({
          ...r,
          documentId: task.documentId,
        }))
      ).catch(console.error);
    }

    return c.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: message }, 400);
  }
});

// POST /api/v1/tasks/:id/heartbeat - Extend claim TTL
app.post('/:id/heartbeat', async (c) => {
  const db = c.var.db;
  const agentId = c.var.agentId!;
  const taskId = c.req.param('id');

  const result = await extendClaim(db, taskId, agentId);

  if (!result.success) {
    return c.json({ error: 'Failed to extend claim - task may not be claimed by you' }, 400);
  }

  return c.json({
    success: true,
    claimExpiresAt: result.claimExpiresAt.toISOString(),
  });
});

// POST /api/v1/tasks/:id/release - Release a claimed task
app.post('/:id/release', async (c) => {
  const db = c.var.db;
  const agentId = c.var.agentId!;
  const taskId = c.req.param('id');

  const released = await releaseTask(db, taskId, agentId);

  if (!released) {
    return c.json({ error: 'Failed to release task' }, 400);
  }

  return c.json({ success: true });
});

export default app;
