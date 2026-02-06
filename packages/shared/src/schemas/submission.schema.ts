import { z } from 'zod';
import { entityMentionSchema, relationshipSchema } from './entity.schema.js';

export const processingMetadataSchema = z.object({
  model: z.string().min(1).max(100),
  durationMs: z.number().int().min(0),
  tokenCount: z.number().int().min(0),
});

export const submissionSummarySchema = z.object({
  tldr: z.string().min(1).max(150),
  detailed: z.string().min(1).max(5000),
  keyTopics: z.array(z.string().min(1).max(100)).min(3).max(7),
  documentType: z.string().min(1).max(100),
  dateRange: z.string().max(100).optional(),
  significance: z.string().min(1).max(1000),
  extractedTitle: z.string().min(1).max(200),  // e.g., "Case 18-2868, Doc 271 - Brown v. Maxwell (2nd Cir. 2019)"
});

export const taskSubmissionSchema = z.object({
  fullText: z.string().min(1),
  entities: z.array(entityMentionSchema),
  relationships: z.array(
    relationshipSchema.omit({ documentId: true })
  ),
  summary: submissionSummarySchema,
  credibilityScore: z.number().min(0).max(1),
  spiceRating: z.number().int().min(1).max(5),
  processingMetadata: processingMetadataSchema,
});

export const submitTaskRequestSchema = z.object({
  submission: taskSubmissionSchema,
});

export const submitTaskResponseSchema = z.object({
  submissionId: z.string().uuid(),
  validationStatus: z.enum(['pending', 'accepted', 'rejected', 'disputed']),
  pointsAwarded: z.number().int(),
});

export type TaskSubmissionInput = z.infer<typeof taskSubmissionSchema>;
export type SubmitTaskRequestInput = z.infer<typeof submitTaskRequestSchema>;
