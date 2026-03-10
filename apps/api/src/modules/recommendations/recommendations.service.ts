import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByAnalysis(
    analysisId: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id: analysisId },
      select: { userId: true },
    });

    if (!analysis) {
      throw new NotFoundException(`Analysis ${analysisId} not found`);
    }

    if (
      analysis.userId !== requestingUserId &&
      requestingUserRole !== Role.ADMIN
    ) {
      throw new ForbiddenException('Access denied');
    }

    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

    const recommendations = await this.prisma.recommendation.findMany({
      where: { analysisId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    // Sort HIGH → MEDIUM → LOW
    return recommendations.sort(
      (a, b) =>
        (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3),
    );
  }
}
