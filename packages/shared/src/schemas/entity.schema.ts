import { z } from 'zod';

export const entityTypeSchema = z.enum([
  'person',
  'organization',
  'location',
  'date',
  'financial',
  'event',
  'vehicle',
  'document_reference',
]);

export const relationshipTypeSchema = z.enum([
  'MET_WITH',
  'TRAVELED_WITH',
  'EMPLOYED_BY',
  'PAID',
  'RECEIVED_PAYMENT',
  'ASSOCIATED_WITH',
  'RELATED_TO',
  'LOCATED_AT',
  'OWNS',
  'MENTIONED_WITH',
]);

export const entityMentionSchema = z.object({
  name: z.string().min(1).max(500),
  type: entityTypeSchema,
  role: z.string().max(255).nullable(),
  confidence: z.number().min(0).max(1),
  spans: z.array(
    z.object({
      start: z.number().int().min(0),
      end: z.number().int().min(0),
    })
  ),
});

export const relationshipSchema = z.object({
  sourceEntity: z.string().min(1).max(500),
  targetEntity: z.string().min(1).max(500),
  relationshipType: relationshipTypeSchema,
  confidence: z.number().min(0).max(1),
  evidenceText: z.string().min(1).max(2000),
  documentId: z.string().uuid(),
});

export type EntityMentionInput = z.infer<typeof entityMentionSchema>;
export type RelationshipInput = z.infer<typeof relationshipSchema>;
