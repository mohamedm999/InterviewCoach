import { z } from "zod";
import type { Role, UserStatus } from "./enums";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_COMPLEXITY_REGEX = /(?=.*[A-Z])(?=.*[0-9])/;
export const PASSWORD_COMPLEXITY_MESSAGE =
  "Password must contain at least 1 uppercase letter and 1 number";

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

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: Role;
  status: UserStatus;
}

export interface AuthResponse {
  user: AuthUser;
}

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`),
});

export type LoginSchemaType = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
    .regex(PASSWORD_COMPLEXITY_REGEX, PASSWORD_COMPLEXITY_MESSAGE),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

export type RegisterSchemaType = z.infer<typeof registerSchema>;
