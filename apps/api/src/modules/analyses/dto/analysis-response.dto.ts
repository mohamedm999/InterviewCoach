import { Context, Priority, RecommendationCategory } from '@prisma/client';

export class RecommendationDto {
  id: string;
  category: RecommendationCategory;
  priority: Priority;
  title: string;
  description: string;
  examples: string[];
}

export class ScoresDto {
  global: number;
  tone: number;
  confidence: number;
  readability: number;
  impact: number;
}

export class AnalysisResponseDto {
  analysisId: string;
  userId: string;
  context: Context;
  inputText: string;
  versionIndex: number;
  scores: ScoresDto;
  recommendations: RecommendationDto[];
  coachingFeedback?: string;
  createdAt: Date;
}
