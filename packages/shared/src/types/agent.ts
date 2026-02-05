export type AgentStatus = 'active' | 'suspended' | 'banned';

export interface Agent {
  id: string;
  apiKey: string;
  name: string | null;
  tasksCompleted: number;
  pointsBalance: number;
  consensusRate: number;
  status: AgentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentRegistration {
  name?: string;
}

export interface AgentRegistrationResponse {
  id: string;
  apiKey: string;
  name: string | null;
}

export interface AgentStats {
  id: string;
  name: string | null;
  tasksCompleted: number;
  pointsBalance: number;
  consensusRate: number;
  rank: number;
}
