import { Hono } from 'hono';
import { sql, ilike, or, and, gte, lte, count } from 'drizzle-orm';
import { documents, documentSummaries, entities } from '@openclaw/db';
import { searchQuerySchema } from '@openclaw/shared';
import type { Env, Variables } from '../types.js';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/v1/search - Full-text + semantic search
app.get('/', async (c) => {
  const db = c.var.db;
  const queryParams = c.req.query();

  const parsed = searchQuerySchema.safeParse(queryParams);
  if (!parsed.success) {
    return c.json({ error: 'Invalid query parameters', details: parsed.error.issues }, 400);
  }

  const { q, type, source, spiceMin, spiceMax, limit, offset } = parsed.data;
  const searchPattern = `%${q}%`;

  const results: {
    documents: Array<{
      id: string;
      source: string;
      fileName: string | null;
      fileType: string;
      tldr: string | null;
      spiceRating: number | null;
      score: number;
    }>;
    entities: Array<{
      id: string;
      canonicalName: string;
      entityType: string;
      aliases: string[];
      score: number;
    }>;
    totalDocuments: number;
    totalEntities: number;
  } = {
    documents: [],
    entities: [],
    totalDocuments: 0,
    totalEntities: 0,
  };

  // Search documents
  if (type === 'all' || type === 'documents') {
    let docQuery = db
      .select({
        id: documents.id,
        source: documents.source,
        fileName: documents.fileName,
        fileType: documents.fileType,
        tldr: documentSummaries.tldr,
        spiceRating: documentSummaries.spiceRating,
        detailedSummary: documentSummaries.detailedSummary,
        fullText: documentSummaries.fullText,
      })
      .from(documents)
      .leftJoin(documentSummaries, sql`${documents.id} = ${documentSummaries.documentId}`)
      .where(
        or(
          ilike(documents.fileName, searchPattern),
          ilike(documentSummaries.tldr, searchPattern),
          ilike(documentSummaries.detailedSummary, searchPattern),
          ilike(documentSummaries.fullText, searchPattern)
        )
      );

    // Apply filters
    const conditions = [];
    if (source) {
      conditions.push(sql`${documents.source} = ${source}`);
    }
    if (spiceMin !== undefined) {
      conditions.push(sql`${documentSummaries.spiceRating} >= ${spiceMin}`);
    }
    if (spiceMax !== undefined) {
      conditions.push(sql`${documentSummaries.spiceRating} <= ${spiceMax}`);
    }

    if (conditions.length > 0) {
      docQuery = docQuery.where(and(...conditions)) as typeof docQuery;
    }

    const docResults = await docQuery.limit(limit).offset(offset);

    results.documents = docResults.map((d) => ({
      id: d.id,
      source: d.source,
      fileName: d.fileName,
      fileType: d.fileType,
      tldr: d.tldr,
      spiceRating: d.spiceRating,
      score: 1, // Simplified scoring - would use proper text ranking in production
    }));

    // Get total count
    const [docCount] = await db
      .select({ count: count() })
      .from(documents)
      .leftJoin(documentSummaries, sql`${documents.id} = ${documentSummaries.documentId}`)
      .where(
        or(
          ilike(documents.fileName, searchPattern),
          ilike(documentSummaries.tldr, searchPattern),
          ilike(documentSummaries.detailedSummary, searchPattern)
        )
      );

    results.totalDocuments = docCount?.count || 0;
  }

  // Search entities
  if (type === 'all' || type === 'entities') {
    const entityResults = await db
      .select()
      .from(entities)
      .where(
        or(
          ilike(entities.canonicalName, searchPattern),
          sql`EXISTS (SELECT 1 FROM unnest(${entities.aliases}) AS alias WHERE alias ILIKE ${searchPattern})`
        )
      )
      .limit(limit)
      .offset(offset);

    results.entities = entityResults.map((e) => ({
      id: e.id,
      canonicalName: e.canonicalName,
      entityType: e.entityType,
      aliases: e.aliases,
      score: 1,
    }));

    const [entityCount] = await db
      .select({ count: count() })
      .from(entities)
      .where(
        or(
          ilike(entities.canonicalName, searchPattern),
          sql`EXISTS (SELECT 1 FROM unnest(${entities.aliases}) AS alias WHERE alias ILIKE ${searchPattern})`
        )
      );

    results.totalEntities = entityCount?.count || 0;
  }

  return c.json(results);
});

export default app;
