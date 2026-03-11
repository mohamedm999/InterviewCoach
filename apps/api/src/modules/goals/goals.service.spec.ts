import { Test, TestingModule } from '@nestjs/testing';
import { GoalsService } from './goals.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('GoalsService', () => {
  let service: GoalsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    userGoal: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockUserId = 'user-123';
  const mockGoalId = 'goal-456';
  const mockGoal = {
    id: mockGoalId,
    userId: mockUserId,
    targetScore: 85,
    category: 'Confidence',
    deadline: new Date('2026-04-01'),
    isCompleted: false,
    completedAt: null,
    currentScore: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoalsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<GoalsService>(GoalsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all goals for a user', async () => {
      const mockGoals = [mockGoal];
      mockPrismaService.userGoal.findMany.mockResolvedValue(mockGoals);

      const result = await service.findAll(mockUserId);

      expect(result).toEqual(mockGoals);
      expect(mockPrismaService.userGoal.findMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if user has no goals', async () => {
      mockPrismaService.userGoal.findMany.mockResolvedValue([]);

      const result = await service.findAll(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create a new goal', async () => {
      const createDto = {
        targetScore: 85,
        category: 'Confidence',
        deadline: '2026-04-01',
      };
      mockPrismaService.userGoal.create.mockResolvedValue(mockGoal);

      const result = await service.create(mockUserId, createDto);

      expect(result).toEqual(mockGoal);
      expect(mockPrismaService.userGoal.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          targetScore: createDto.targetScore,
          category: createDto.category,
          deadline: new Date(createDto.deadline),
        },
      });
    });

    it('should create goal without optional fields', async () => {
      const createDto = {
        targetScore: 90,
      };
      const goalWithoutOptionals = { ...mockGoal, category: null, deadline: null };
      mockPrismaService.userGoal.create.mockResolvedValue(goalWithoutOptionals);

      const result = await service.create(mockUserId, createDto);

      expect(result).toEqual(goalWithoutOptionals);
      expect(mockPrismaService.userGoal.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          targetScore: createDto.targetScore,
          category: undefined,
          deadline: null,
        },
      });
    });
  });

  describe('update', () => {
    it('should update a goal', async () => {
      const updateDto = {
        targetScore: 90,
        isCompleted: true,
      };
      const updatedGoal = { ...mockGoal, ...updateDto, completedAt: new Date() };
      mockPrismaService.userGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrismaService.userGoal.update.mockResolvedValue(updatedGoal);

      const result = await service.update(mockUserId, mockGoalId, updateDto);

      expect(result).toEqual(updatedGoal);
      expect(mockPrismaService.userGoal.findUnique).toHaveBeenCalledWith({
        where: { id: mockGoalId },
      });
    });

    it('should throw NotFoundException if goal does not exist', async () => {
      mockPrismaService.userGoal.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockUserId, mockGoalId, { targetScore: 90 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not own the goal', async () => {
      const otherUserGoal = { ...mockGoal, userId: 'other-user' };
      mockPrismaService.userGoal.findUnique.mockResolvedValue(otherUserGoal);

      await expect(
        service.update(mockUserId, mockGoalId, { targetScore: 90 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should set completedAt when marking as completed', async () => {
      const updateDto = { isCompleted: true };
      mockPrismaService.userGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrismaService.userGoal.update.mockResolvedValue({
        ...mockGoal,
        isCompleted: true,
        completedAt: expect.any(Date),
      });

      await service.update(mockUserId, mockGoalId, updateDto);

      expect(mockPrismaService.userGoal.update).toHaveBeenCalledWith({
        where: { id: mockGoalId },
        data: expect.objectContaining({
          isCompleted: true,
          completedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('remove', () => {
    it('should delete a goal', async () => {
      mockPrismaService.userGoal.findUnique.mockResolvedValue(mockGoal);
      mockPrismaService.userGoal.delete.mockResolvedValue(mockGoal);

      const result = await service.remove(mockUserId, mockGoalId);

      expect(result).toEqual({ message: 'Goal deleted successfully' });
      expect(mockPrismaService.userGoal.delete).toHaveBeenCalledWith({
        where: { id: mockGoalId },
      });
    });

    it('should throw NotFoundException if goal does not exist', async () => {
      mockPrismaService.userGoal.findUnique.mockResolvedValue(null);

      await expect(service.remove(mockUserId, mockGoalId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user does not own the goal', async () => {
      const otherUserGoal = { ...mockGoal, userId: 'other-user' };
      mockPrismaService.userGoal.findUnique.mockResolvedValue(otherUserGoal);

      await expect(service.remove(mockUserId, mockGoalId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
