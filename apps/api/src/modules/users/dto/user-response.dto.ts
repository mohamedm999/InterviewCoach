import { Role as PrismaRole } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  displayName: string | null;
  role: PrismaRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
