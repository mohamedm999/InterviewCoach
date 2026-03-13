import { UsersService } from './users.service';
import { NotFoundException } from '@nestjs/common';
import { UserStatus } from '@prisma/client';

describe('UsersService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma as never);
  });

  it('uses pageSize from the admin pagination query', async () => {
    prisma.user.findMany.mockResolvedValue([]);
    prisma.user.count.mockResolvedValue(0);

    const result = await service.findAll({ page: 2, pageSize: 25 } as never);

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {},
      skip: 25,
      take: 25,
      orderBy: { createdAt: 'desc' },
    });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(25);
  });

  it('throws a 404 when updating the status of a missing user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.updateStatus('missing-user', UserStatus.ACTIVE)).rejects.toThrow(
      new NotFoundException('User not found'),
    );

    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
