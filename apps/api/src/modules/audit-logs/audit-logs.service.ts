import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from './dto/pagination-query.dto';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              email: true,
              displayName: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count(),
    ]);

    return {
      data: logs,
      total,
      page,
      pageSize,
    };
  }

  async create(data: {
    actorUserId: string;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: any;
    ipAddress?: string;
    userAgent?: string;
  }) {
    return this.prisma.auditLog.create({
      data,
    });
  }
}
