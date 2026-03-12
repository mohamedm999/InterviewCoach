import { z } from "zod";
import {
  Context,
  Priority,
  RecommendationCategory,
} from "./enums";

export const MAX_PITCH_LENGTH = 5000;
export const MIN_PITCH_LENGTH = 50;

export interface CreateAnalysisDto {
  content: string;
  context: Context;
}

export interface ScoresResponse {
  global: number;
  tone: number;
  confidence: number;
  readability: number;
  impact: number;
}

export interface RecommendationResponse {
  id: string;
  category: RecommendationCategory;
  priority: Priority;
  title: string;
  description: string;
  examples: string[];
}

export interface AnalysisResponse {
  analysisId: string;
  userId: string;
  context: Context;
  inputText: string;
  versionIndex: number;
  scores: ScoresResponse;
  recommendations: RecommendationResponse[];
  coachingFeedback?: string;
  createdAt: string;
}

export type Analysis = AnalysisResponse;
export type Recommendation = RecommendationResponse;
export type CreateAnalysisRequest = CreateAnalysisDto;

export const analysisSchema = z.object({
  context: z.nativeEnum(Context),
  content: z
    .string()
    .min(
      MIN_PITCH_LENGTH,
      `Your pitch is too short. Please provide at least ${MIN_PITCH_LENGTH} characters.`
    )
    .max(
      MAX_PITCH_LENGTH,
      `Your pitch is too long. Please keep it under ${MAX_PITCH_LENGTH} characters.`
    ),
});

export type AnalysisSchemaType = z.infer<typeof analysisSchema>;
