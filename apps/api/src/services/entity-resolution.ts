import { eq, sql, ilike, or } from 'drizzle-orm';
import { entities, documentEntities, entityRelationships } from '@openclaw/db';
import type { Database } from '@openclaw/db';
import type { EntityMention, RelationshipType } from '@openclaw/shared';

const FUZZY_MATCH_THRESHOLD = 0.8;

// Simple Levenshtein distance for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1,
          matrix[i]![j - 1]! + 1,
          matrix[i - 1]![j]! + 1
        );
      }
    }
  }

  return matrix[b.length]![a.length]!;
}

function similarityScore(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a.toLowerCase(), b.toLowerCase()) / maxLen;
}

export async function findOrCreateEntity(
  db: Database,
  mention: EntityMention
): Promise<string> {
  // First try exact match on canonical name
  const [exactMatch] = await db
    .select()
    .from(entities)
    .where(
      sql`LOWER(${entities.canonicalName}) = LOWER(${mention.name}) AND ${entities.entityType} = ${mention.type}`
    );

  if (exactMatch) {
    return exactMatch.id;
  }

  // Try fuzzy match using pg_trgm similarity (if available)
  // Fall back to fetching candidates and comparing in JS
  const candidates = await db
    .select()
    .from(entities)
    .where(eq(entities.entityType, mention.type))
    .limit(100);

  for (const candidate of candidates) {
    const similarity = similarityScore(mention.name, candidate.canonicalName);
    if (similarity >= FUZZY_MATCH_THRESHOLD) {
      // Add as alias if not already present
      const aliases = candidate.aliases || [];
      if (!aliases.includes(mention.name) && mention.name !== candidate.canonicalName) {
        await db
          .update(entities)
          .set({
            aliases: [...aliases, mention.name],
            updatedAt: new Date(),
          })
          .where(eq(entities.id, candidate.id));
      }
      return candidate.id;
    }
  }

  // No match found, create new entity
  const [newEntity] = await db
    .insert(entities)
    .values({
      canonicalName: mention.name,
      entityType: mention.type,
      aliases: [],
      metadata: {},
    })
    .returning();

  return newEntity!.id;
}

export async function linkEntityToDocument(
  db: Database,
  entityId: string,
  documentId: string,
  mention: EntityMention
): Promise<void> {
  await db
    .insert(documentEntities)
    .values({
      documentId,
      entityId,
      role: mention.role,
      confidence: String(mention.confidence),
      spans: mention.spans,
    })
    .onConflictDoNothing();
}

export async function createRelationship(
  db: Database,
  sourceEntityId: string,
  targetEntityId: string,
  relationshipType: RelationshipType,
  confidence: number,
  evidenceText: string,
  documentId: string
): Promise<void> {
  await db.insert(entityRelationships).values({
    sourceEntityId,
    targetEntityId,
    relationshipType,
    confidence: String(confidence),
    evidenceText,
    documentId,
  });
}

export async function processSubmissionEntities(
  db: Database,
  documentId: string,
  mentionedEntities: EntityMention[],
  relationships: Array<{
    sourceEntity: string;
    targetEntity: string;
    relationshipType: RelationshipType;
    confidence: number;
    evidenceText: string;
  }>
): Promise<void> {
  // Create a map of mention names to entity IDs
  const entityIdMap = new Map<string, string>();

  // Process all entity mentions
  for (const mention of mentionedEntities) {
    const entityId = await findOrCreateEntity(db, mention);
    entityIdMap.set(mention.name, entityId);
    await linkEntityToDocument(db, entityId, documentId, mention);
  }

  // Process relationships
  for (const rel of relationships) {
    const sourceId = entityIdMap.get(rel.sourceEntity);
    const targetId = entityIdMap.get(rel.targetEntity);

    if (sourceId && targetId) {
      await createRelationship(
        db,
        sourceId,
        targetId,
        rel.relationshipType,
        rel.confidence,
        rel.evidenceText,
        documentId
      );
    }
  }
}
