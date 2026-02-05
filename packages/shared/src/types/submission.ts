import type { EntityMention, Relationship } from './entity.js';

export type ValidationStatus = 'pending' | 'accepted' | 'rejected' | 'disputed';

export interface ProcessingMetadata {
  model: string;
  durationMs: number;
  tokenCount: number;
}

export interface SubmissionSummary {
  tldr: string;
  detailed: string;
  keyTopics: string[];
  documentType: string;
  dateRange?: string;
  significance: string;
}

export interface TaskSubmission {
  fullText: string;
  entities: EntityMention[];
  relationships: Relationship[];
  summary: SubmissionSummary;
  credibilityScore: number;
  spiceRating: number;
  processingMetadata: ProcessingMetadata;
}

export interface TaskSubmissionRecord {
  id: string;
  taskId: string;
  agentId: string;
  fullText: string | null;
  entities: EntityMention[];
  relationships: Relationship[];
  summary: SubmissionSummary | null;
  credibilityScore: number | null;
  spiceRating: number | null;
  processingMetadata: ProcessingMetadata | null;
  validationStatus: ValidationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitTaskRequest {
  submission: TaskSubmission;
}

export interface SubmitTaskResponse {
  submissionId: string;
  validationStatus: ValidationStatus;
  pointsAwarded: number;
}
