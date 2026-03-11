import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

@Injectable()
export class GoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.userGoal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateGoalDto) {
    return this.prisma.userGoal.create({
      data: {
        userId,
        targetScore: dto.targetScore,
        category: dto.category,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.prisma.userGoal.findUnique({ where: { id } });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.userGoal.update({
      where: { id },
      data: {
        ...(dto.targetScore !== undefined && { targetScore: dto.targetScore }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.deadline !== undefined && { 
          deadline: dto.deadline ? new Date(dto.deadline) : null 
        }),
        ...(dto.isCompleted !== undefined && { 
          isCompleted: dto.isCompleted,
          completedAt: dto.isCompleted ? new Date() : null,
        }),
      },
    });
  }

  async remove(userId: string, id: string) {
    const goal = await this.prisma.userGoal.findUnique({ where: { id } });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    if (goal.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    await this.prisma.userGoal.delete({ where: { id } });
    return { message: 'Goal deleted successfully' };
  }
}
