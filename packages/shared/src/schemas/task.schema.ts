import { z } from 'zod';

export const taskTypeSchema = z.enum([
  'full_analysis',
  'ocr_only',
  'entity_extraction',
  'relationship_extraction',
]);

export const taskStatusSchema = z.enum([
  'AVAILABLE',
  'CLAIMED',
  'SUBMITTED',
  'VALIDATED',
  'DISPUTED',
  'FAILED',
]);

export const taskSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  taskType: taskTypeSchema,
  status: taskStatusSchema,
  priority: z.number().int().min(0).max(1000),
  claimedBy: z.string().uuid().nullable(),
  claimExpiresAt: z.string().datetime().nullable(),
  requiredSubmissions: z.number().int().min(1).max(5),
  submissionCount: z.number().int().min(0),
});

export const claimTaskResponseSchema = z.object({
  task: z.object({
    id: z.string().uuid(),
    documentId: z.string().uuid(),
    taskType: taskTypeSchema,
    status: taskStatusSchema,
    priority: z.number().int(),
    document: z.object({
      id: z.string().uuid(),
      r2Key: z.string(),
      fileName: z.string().nullable(),
      fileType: z.string(),
      pageCount: z.number().int().nullable(),
      source: z.string(),
    }),
    r2Url: z.string().url(),
  }),
  claimExpiresAt: z.string().datetime(),
});

export const heartbeatResponseSchema = z.object({
  success: z.boolean(),
  claimExpiresAt: z.string().datetime(),
});

export type TaskInput = z.infer<typeof taskSchema>;
