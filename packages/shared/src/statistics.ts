export interface ProgressionItem {
  date: string;
  scoreGlobal: number;
  scoreTone: number;
  scoreConfidence: number;
  scoreReadability: number;
  scoreImpact: number;
}

export interface ContextBreakdownEntry {
  context: string;
  avgScore: number;
  count: number;
}

export interface PeerStats {
  me: {
    totalAnalyses: number;
    avgGlobal: number;
    avgTone: number;
    avgConfidence: number;
    avgReadability: number;
    avgImpact: number;
  };
  platform: {
    totalAnalyses: number;
    avgGlobal: number;
    avgTone: number;
    avgConfidence: number;
    avgReadability: number;
    avgImpact: number;
  };
  percentile: number;
  myContextBreakdown: ContextBreakdownEntry[];
  platformContextBreakdown: ContextBreakdownEntry[];
}

export interface UserProgressionResponse {
  data: ProgressionItem[];
}
