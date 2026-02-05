import { Hono } from 'hono';
import { eq, sql, count, desc } from 'drizzle-orm';
import { entities, documentEntities, entityRelationships } from '@openclaw/db';
import type { Env, Variables } from '../types.js';
import type { EntityGraph, EntityGraphNode, EntityGraphEdge } from '@openclaw/shared';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// GET /api/v1/entities/:id - Get entity profile
app.get('/:id', async (c) => {
  const db = c.var.db;
  const entityId = c.req.param('id');

  const [entity] = await db.select().from(entities).where(eq(entities.id, entityId));

  if (!entity) {
    return c.json({ error: 'Entity not found' }, 404);
  }

  // Get document count
  const [docCountResult] = await db
    .select({ count: count() })
    .from(documentEntities)
    .where(eq(documentEntities.entityId, entityId));

  // Get relationship count
  const [relCountResult] = await db
    .select({ count: count() })
    .from(entityRelationships)
    .where(
      sql`${entityRelationships.sourceEntityId} = ${entityId} OR ${entityRelationships.targetEntityId} = ${entityId}`
    );

  return c.json({
    id: entity.id,
    canonicalName: entity.canonicalName,
    entityType: entity.entityType,
    aliases: entity.aliases,
    metadata: entity.metadata,
    documentCount: docCountResult?.count || 0,
    relationshipCount: relCountResult?.count || 0,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  });
});

// GET /api/v1/entities/:id/graph - Get entity subgraph for visualization
app.get('/:id/graph', async (c) => {
  const db = c.var.db;
  const entityId = c.req.param('id');
  const depth = parseInt(c.req.query('depth') || '1');
  const limit = parseInt(c.req.query('limit') || '50');

  // Get the central entity
  const [centralEntity] = await db.select().from(entities).where(eq(entities.id, entityId));

  if (!centralEntity) {
    return c.json({ error: 'Entity not found' }, 404);
  }

  // Get relationships involving this entity
  const relationships = await db
    .select({
      id: entityRelationships.id,
      sourceEntityId: entityRelationships.sourceEntityId,
      targetEntityId: entityRelationships.targetEntityId,
      relationshipType: entityRelationships.relationshipType,
    })
    .from(entityRelationships)
    .where(
      sql`${entityRelationships.sourceEntityId} = ${entityId} OR ${entityRelationships.targetEntityId} = ${entityId}`
    )
    .limit(limit);

  // Collect all entity IDs
  const entityIds = new Set<string>([entityId]);
  for (const rel of relationships) {
    entityIds.add(rel.sourceEntityId);
    entityIds.add(rel.targetEntityId);
  }

  // Fetch all entities
  const relatedEntities = await db
    .select()
    .from(entities)
    .where(sql`${entities.id} IN ${Array.from(entityIds)}`);

  // Get document counts for each entity
  const docCounts = await db
    .select({
      entityId: documentEntities.entityId,
      count: count(),
    })
    .from(documentEntities)
    .where(sql`${documentEntities.entityId} IN ${Array.from(entityIds)}`)
    .groupBy(documentEntities.entityId);

  const docCountMap = new Map(docCounts.map((d) => [d.entityId, d.count]));

  // Build graph
  const nodes: EntityGraphNode[] = relatedEntities.map((e) => ({
    id: e.id,
    name: e.canonicalName,
    type: e.entityType as EntityGraphNode['type'],
    documentCount: docCountMap.get(e.id) || 0,
  }));

  // Aggregate edges by source-target pair
  const edgeMap = new Map<string, { source: string; target: string; type: string; count: number }>();
  for (const rel of relationships) {
    const key = `${rel.sourceEntityId}-${rel.targetEntityId}-${rel.relationshipType}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      edgeMap.set(key, {
        source: rel.sourceEntityId,
        target: rel.targetEntityId,
        type: rel.relationshipType,
        count: 1,
      });
    }
  }

  const edges: EntityGraphEdge[] = Array.from(edgeMap.values()).map((e) => ({
    source: e.source,
    target: e.target,
    type: e.type as EntityGraphEdge['type'],
    weight: e.count,
  }));

  const graph: EntityGraph = { nodes, edges };
  return c.json(graph);
});

// GET /api/v1/entities - List entities with pagination
app.get('/', async (c) => {
  const db = c.var.db;
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');
  const type = c.req.query('type');

  let query = db.select().from(entities);

  if (type) {
    query = query.where(eq(entities.entityType, type)) as typeof query;
  }

  const results = await query.orderBy(desc(entities.createdAt)).limit(limit).offset(offset);

  const [totalResult] = await db.select({ count: count() }).from(entities);

  return c.json({
    entities: results,
    total: totalResult?.count || 0,
    limit,
    offset,
  });
});

export default app;
