import { Role as PrismaRole, UserStatus } from '@prisma/client';

export class AuthResponseDto {
  user: {
    id: string;
    email: string;
    displayName: string | null;
    avatarUrl: string | null;
    emailVerified: boolean;
    role: PrismaRole;
    status: UserStatus;
  };
}
