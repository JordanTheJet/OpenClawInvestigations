import { Hono } from 'hono';
import { eq, desc, count } from 'drizzle-orm';
import { documents, documentSummaries, documentEntities, entities } from '@openclaw/db';
import type { Env, Variables } from '../types.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/v1/documents/:id - Get document with summary
app.get('/:id', async (c) => {
  const db = c.var.db;
  const documentId = c.req.param('id');

  const [doc] = await db.select().from(documents).where(eq(documents.id, documentId));

  if (!doc) {
    return c.json({ error: 'Document not found' }, 404);
  }

  // Get summary if exists
  const [summary] = await db
    .select()
    .from(documentSummaries)
    .where(eq(documentSummaries.documentId, documentId));

  // Get entities mentioned in this document
  const mentionedEntities = await db
    .select({
      id: entities.id,
      canonicalName: entities.canonicalName,
      entityType: entities.entityType,
      role: documentEntities.role,
      confidence: documentEntities.confidence,
    })
    .from(documentEntities)
    .innerJoin(entities, eq(documentEntities.entityId, entities.id))
    .where(eq(documentEntities.documentId, documentId))
    .limit(100);

  return c.json({
    document: {
      id: doc.id,
      hash: doc.hash,
      source: doc.source,
      sourceUrl: doc.sourceUrl,
      r2Key: doc.r2Key,
      fileName: doc.fileName,
      fileType: doc.fileType,
      fileSizeBytes: doc.fileSizeBytes,
      pageCount: doc.pageCount,
      processingStatus: doc.processingStatus,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    },
    summary: summary
      ? {
          tldr: summary.tldr,
          detailedSummary: summary.detailedSummary,
          keyTopics: summary.keyTopics,
          documentType: summary.documentType,
          dateRange: summary.dateRange,
          significance: summary.significance,
          spiceRating: summary.spiceRating,
          credibilityScore: summary.credibilityScore ? parseFloat(summary.credibilityScore) : null,
        }
      : null,
    entities: mentionedEntities.map((e) => ({
      id: e.id,
      name: e.canonicalName,
      type: e.entityType,
      role: e.role,
      confidence: e.confidence ? parseFloat(e.confidence) : null,
    })),
  });
});

// GET /api/v1/documents - List documents with pagination
app.get('/', async (c) => {
  const db = c.var.db;
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  const source = c.req.query('source');
  const status = c.req.query('status');

  let query = db
    .select({
      id: documents.id,
      source: documents.source,
      fileName: documents.fileName,
      fileType: documents.fileType,
      pageCount: documents.pageCount,
      processingStatus: documents.processingStatus,
      createdAt: documents.createdAt,
      tldr: documentSummaries.tldr,
      spiceRating: documentSummaries.spiceRating,
    })
    .from(documents)
    .leftJoin(documentSummaries, eq(documents.id, documentSummaries.documentId));

  if (source) {
    query = query.where(eq(documents.source, source)) as typeof query;
  }

  if (status) {
    query = query.where(eq(documents.processingStatus, status)) as typeof query;
  }

  const results = await query.orderBy(desc(documents.createdAt)).limit(limit).offset(offset);

  const [totalResult] = await db.select({ count: count() }).from(documents);

  return c.json({
    documents: results,
    total: totalResult?.count || 0,
    limit,
    offset,
  });
});

export default app;
