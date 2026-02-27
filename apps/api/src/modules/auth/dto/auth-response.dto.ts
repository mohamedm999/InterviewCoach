import { Role as PrismaRole, UserStatus } from '@prisma/client';
import { AuthResponse as SharedAuthResponse } from '@interviewcoach/shared';

export class AuthResponseDto implements Omit<SharedAuthResponse, 'user'> {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    displayName: string | null;
    role: PrismaRole;
    status: UserStatus;
  };
}
