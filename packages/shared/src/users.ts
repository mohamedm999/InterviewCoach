import type { Role, UserStatus } from "./enums";

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

export type User = UserResponse;
