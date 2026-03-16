import { Test, TestingModule } from '@nestjs/testing';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

describe('GoalsController', () => {
  let controller: GoalsController;
  let service: GoalsService;

  const mockGoalsService = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockRequest = {
    user: {
      userId: 'user-123',
      email: 'test@example.com',
      role: 'USER',
    },
  };

  const mockGoal = {
    id: 'goal-456',
    userId: 'user-123',
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
      controllers: [GoalsController],
      providers: [
        {
          provide: GoalsService,
          useValue: mockGoalsService,
        },
      ],
    }).compile();

    controller = module.get<GoalsController>(GoalsController);
    service = module.get<GoalsService>(GoalsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all goals for the authenticated user', async () => {
      const mockGoals = [mockGoal];
      mockGoalsService.findAll.mockResolvedValue(mockGoals);

      const result = await controller.findAll(mockRequest);

      expect(result).toEqual(mockGoals);
      expect(mockGoalsService.findAll).toHaveBeenCalledWith(
        mockRequest.user.userId,
      );
    });
  });

  describe('create', () => {
    it('should create a new goal', async () => {
      const createDto = {
        targetScore: 85,
        category: 'Confidence',
        deadline: '2026-04-01',
      };
      mockGoalsService.create.mockResolvedValue(mockGoal);

      const result = await controller.create(mockRequest, createDto);

      expect(result).toEqual(mockGoal);
      expect(mockGoalsService.create).toHaveBeenCalledWith(
        mockRequest.user.userId,
        createDto,
      );
    });
  });

  describe('update', () => {
    it('should update a goal', async () => {
      const updateDto = {
        targetScore: 90,
        isCompleted: true,
      };
      const updatedGoal = { ...mockGoal, ...updateDto };
      mockGoalsService.update.mockResolvedValue(updatedGoal);

      const result = await controller.update(
        mockRequest,
        mockGoal.id,
        updateDto,
      );

      expect(result).toEqual(updatedGoal);
      expect(mockGoalsService.update).toHaveBeenCalledWith(
        mockRequest.user.userId,
        mockGoal.id,
        updateDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete a goal', async () => {
      mockGoalsService.remove.mockResolvedValue({
        message: 'Goal deleted successfully',
      });

      await controller.remove(mockRequest, mockGoal.id);

      expect(mockGoalsService.remove).toHaveBeenCalledWith(
        mockRequest.user.userId,
        mockGoal.id,
      );
    });
  });
});
