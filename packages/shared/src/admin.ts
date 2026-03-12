import type { UserStatus } from "./enums";

export interface AnalysisConfigWeights {
  tone: number;
  confidence: number;
  readability: number;
  impact: number;
}

export interface AnalysisConfigThresholds {
  high: number;
  medium: number;
}

export interface AnalysisConfig {
  id?: string;
  weights: AnalysisConfigWeights;
  thresholds: AnalysisConfigThresholds;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateConfigRequest {
  weights: AnalysisConfigWeights;
  thresholds: AnalysisConfigThresholds;
}

export interface AdminOverviewData {
  totalUsers: number;
  activeUsers?: number;
  totalAnalyses: number;
  averageScore?: number;
  avgGlobalScore?: number;
  improvementRate: number;
  contextDistribution?: Record<string, number>;
}

export interface ByContextEntry {
  count: number;
  avgScore: number;
}

export interface UserData {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  status: UserStatus;
  createdAt: string;
}

export interface AuditLogActor {
  email: string;
  displayName: string | null;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  createdAt: string;
  actor: AuditLogActor;
  metadata?: unknown;
}
