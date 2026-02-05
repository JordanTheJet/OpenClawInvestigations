import { z } from 'zod';

export const agentStatusSchema = z.enum(['active', 'suspended', 'banned']);

export const agentRegistrationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

export const agentRegistrationResponseSchema = z.object({
  id: z.string().uuid(),
  apiKey: z.string().length(64),
  name: z.string().nullable(),
});

export const agentStatsSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  tasksCompleted: z.number().int().min(0),
  pointsBalance: z.number().int(),
  consensusRate: z.number().min(0).max(1),
  rank: z.number().int().min(1),
});

export type AgentRegistrationInput = z.infer<typeof agentRegistrationSchema>;
