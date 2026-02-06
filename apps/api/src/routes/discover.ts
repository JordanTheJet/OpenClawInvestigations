import { Hono } from 'hono';
import { z } from 'zod';
import type { Env, Variables } from '../types.js';
import { processDiscoveredDocument, type DiscoveredDocument } from '../services/document-queue.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

const discoverRequestSchema = z.object({
  documents: z.array(z.object({
    sourceUrl: z.string().url(),
    fileName: z.string(),
    source: z.enum(['doj', 'archive', 'fbi']),
    fileType: z.string().optional(),
  })).min(1).max(100),
});

// POST /api/v1/discover - Add documents to discovery queue
// This can be called by the scraper or manually
app.post('/', async (c) => {
  const db = c.var.db;
  const body = await c.req.json();

  const parsed = discoverRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.issues }, 400);
  }

  const results = {
    total: parsed.data.documents.length,
    new: 0,
    existing: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const doc of parsed.data.documents) {
    try {
      const result = await processDiscoveredDocument(db, doc as DiscoveredDocument);
      if (result.isNew) {
        results.new++;
      } else {
        results.existing++;
      }
    } catch (error) {
      results.failed++;
      results.errors.push(`${doc.sourceUrl}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return c.json(results);
});

// POST /api/v1/discover/queue - Add documents to Cloudflare Queue (batch processing)
app.post('/queue', async (c) => {
  const body = await c.req.json();
  const queue = c.env.DOCUMENT_QUEUE;

  if (!queue) {
    return c.json({ error: 'Queue not configured' }, 500);
  }

  const parsed = discoverRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid request', details: parsed.error.issues }, 400);
  }

  // Send to queue for async processing
  await queue.sendBatch(
    parsed.data.documents.map((doc) => ({
      body: doc,
    }))
  );

  return c.json({
    queued: parsed.data.documents.length,
    message: 'Documents queued for processing',
  });
});

export default app;
