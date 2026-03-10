import { Role as PrismaRole, UserStatus } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: PrismaRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}
