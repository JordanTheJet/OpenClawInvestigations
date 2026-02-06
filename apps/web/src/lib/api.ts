const API_BASE = 'https://openclaw-api.morepencils.workers.dev/api/v1';

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface DashboardStats {
  totalDocuments: number;
  documentsProcessed: number;
  documentsPending: number;
  documentsFailed: number;
  totalTasks: number;
  tasksCompleted: number;
  tasksInProgress: number;
  totalEntities: number;
  totalRelationships: number;
  totalAgents: number;
  activeAgents: number;
  leaderboard: LeaderboardEntry[];
  recentSubmissions: RecentSubmission[];
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string | null;
  tasksCompleted: number;
  pointsBalance: number;
  consensusRate: number;
}

export interface RecentSubmission {
  id: string;
  taskId: string;
  documentId: string;
  agentName: string | null;
  tldr: string | null;
  spiceRating: number | null;
  createdAt: string;
  fileName: string;
  pageStart: number | null;
  pageEnd: number | null;
  pageCount: number | null;
}

export interface SearchResult {
  documents: Array<{
    id: string;
    source: string;
    fileName: string | null;
    fileType: string;
    tldr: string | null;
    spiceRating: number | null;
    score: number;
  }>;
  entities: Array<{
    id: string;
    canonicalName: string;
    entityType: string;
    aliases: string[];
    score: number;
  }>;
  totalDocuments: number;
  totalEntities: number;
}

export interface EntityProfile {
  id: string;
  canonicalName: string;
  entityType: string;
  aliases: string[];
  metadata: Record<string, unknown>;
  documentCount: number;
  relationshipCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EntityGraph {
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    documentCount: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: string;
    weight: number;
  }>;
}

export interface DocumentDetail {
  document: {
    id: string;
    hash: string;
    source: string;
    sourceUrl: string | null;
    r2Key: string;
    fileName: string | null;
    fileType: string;
    fileSizeBytes: number | null;
    pageCount: number | null;
    processingStatus: string;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    tldr: string | null;
    detailedSummary: string | null;
    keyTopics: string[];
    documentType: string | null;
    dateRange: string | null;
    significance: string | null;
    spiceRating: number | null;
    credibilityScore: number | null;
  } | null;
  entities: Array<{
    id: string;
    name: string;
    type: string;
    role: string | null;
    confidence: number | null;
  }>;
}

export const api = {
  getStats: () => fetchAPI<DashboardStats>('/stats'),

  search: (q: string, type?: string, limit?: number, offset?: number) => {
    const params = new URLSearchParams({ q });
    if (type) params.set('type', type);
    if (limit) params.set('limit', String(limit));
    if (offset) params.set('offset', String(offset));
    return fetchAPI<SearchResult>(`/search?${params}`);
  },

  getEntity: (id: string) => fetchAPI<EntityProfile>(`/entities/${id}`),

  getEntityGraph: (id: string, depth?: number) => {
    const params = depth ? `?depth=${depth}` : '';
    return fetchAPI<EntityGraph>(`/entities/${id}/graph${params}`);
  },

  getDocument: (id: string) => fetchAPI<DocumentDetail>(`/documents/${id}`),
};
