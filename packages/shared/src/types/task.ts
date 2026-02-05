export type TaskType = 'full_analysis' | 'ocr_only' | 'entity_extraction' | 'relationship_extraction';
export type TaskStatus =
  | 'AVAILABLE'
  | 'CLAIMED'
  | 'SUBMITTED'
  | 'VALIDATED'
  | 'DISPUTED'
  | 'FAILED';

export interface Task {
  id: string;
  documentId: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: number;
  claimedBy: string | null;
  claimExpiresAt: Date | null;
  requiredSubmissions: number;
  submissionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskWithDocument extends Task {
  document: {
    id: string;
    r2Key: string;
    fileName: string | null;
    fileType: string;
    pageCount: number | null;
    source: string;
  };
  r2Url: string;
}

export interface ClaimTaskResponse {
  task: TaskWithDocument;
  claimExpiresAt: Date;
}
