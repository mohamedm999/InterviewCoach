import { z } from "zod";

// Enums
export enum Role {
  USER = "USER",
  ADMIN = "ADMIN",
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  BANNED = "BANNED",
}

export enum Context {
  FORMAL = "FORMAL",
  STARTUP = "STARTUP",
  TECHNICAL = "TECHNICAL",
  CREATIVE = "CREATIVE",
}

export enum Priority {
  HIGH = "HIGH",
  MEDIUM = "MEDIUM",
  LOW = "LOW",
}

export enum RecommendationCategory {
  TONE = "TONE",
  CONFIDENCE = "CONFIDENCE",
  READABILITY = "READABILITY",
  IMPACT = "IMPACT",
  STRUCTURE = "STRUCTURE",
  GENERAL = "GENERAL",
}

// Interfaces (DTO mirrors matching backend)
export interface RegisterDto {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    role: Role;
    status: UserStatus;
  };
}

export interface UserResponse {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

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

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Constants
export const MAX_PITCH_LENGTH = 5000;
export const MIN_PITCH_LENGTH = 50;

// Schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export type LoginSchemaType = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /(?=.*[A-Z])(?=.*[0-9])/,
      "Password must contain at least 1 uppercase letter and 1 number"
    ),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});
export type RegisterSchemaType = z.infer<typeof registerSchema>;

export const analysisSchema = z.object({
  context: z.nativeEnum(Context),
  content: z
    .string()
    .min(10, "Your pitch is too short. Please provide at least 10 characters."),
});
export type AnalysisSchemaType = z.infer<typeof analysisSchema>;
