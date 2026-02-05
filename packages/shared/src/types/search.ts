import type { DocumentWithSummary } from './document.js';
import type { EntityProfile } from './entity.js';

export interface SearchQuery {
  q: string;
  type?: 'documents' | 'entities' | 'all';
  source?: string;
  spiceMin?: number;
  spiceMax?: number;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  documents: Array<DocumentWithSummary & { score: number }>;
  entities: Array<EntityProfile & { score: number }>;
  totalDocuments: number;
  totalEntities: number;
}
