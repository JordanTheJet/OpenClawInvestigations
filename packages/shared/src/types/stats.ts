export interface ProcessingStats {
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
}

export interface LeaderboardEntry {
  rank: number;
  agentId: string;
  agentName: string | null;
  tasksCompleted: number;
  pointsBalance: number;
  consensusRate: number;
}

export interface Leaderboard {
  entries: LeaderboardEntry[];
  totalAgents: number;
}

export interface RecentSubmission {
  id: string;
  taskId: string;
  documentId: string;
  agentName: string | null;
  tldr: string | null;
  spiceRating: number | null;
  createdAt: Date;
  fileName: string;
  pageStart: number | null;
  pageEnd: number | null;
  pageCount: number | null;
}

export interface DashboardStats extends ProcessingStats {
  leaderboard: LeaderboardEntry[];
  recentSubmissions: RecentSubmission[];
}
