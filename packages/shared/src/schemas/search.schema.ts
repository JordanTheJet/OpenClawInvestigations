import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(500),
  type: z.enum(['documents', 'entities', 'all']).default('all'),
  source: z.string().max(50).optional(),
  spiceMin: z.coerce.number().int().min(1).max(5).optional(),
  spiceMax: z.coerce.number().int().min(1).max(5).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
