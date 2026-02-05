export type DocumentSource = 'doj' | 'house_oversight' | 'fbi' | 'court_records';
export type FileType = 'pdf' | 'image' | 'video' | 'text';
export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Document {
  id: string;
  hash: string;
  source: DocumentSource;
  sourceUrl: string | null;
  r2Key: string;
  fileName: string | null;
  fileType: FileType;
  fileSizeBytes: number | null;
  pageCount: number | null;
  processingStatus: ProcessingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentSummary {
  id: string;
  documentId: string;
  fullText: string | null;
  tldr: string | null;
  detailedSummary: string | null;
  keyTopics: string[];
  documentType: string | null;
  dateRange: string | null;
  significance: string | null;
  spiceRating: number | null;
  credibilityScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentWithSummary extends Document {
  summary: DocumentSummary | null;
}
