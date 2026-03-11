import { Role as PrismaRole, UserStatus } from '@prisma/client';

export interface AuthenticatedUserPayload {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: PrismaRole;
  status: UserStatus;
}

export interface AuthSessionResult {
  accessToken: string;
  refreshToken: string;
  user: AuthenticatedUserPayload;
}
