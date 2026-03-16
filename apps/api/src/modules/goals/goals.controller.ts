import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { CreateGoalDto, UpdateGoalDto } from './dto/goal.dto';

@Controller('stats/me/goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  // GET /stats/me/goals
  @Get()
  findAll(@Req() req) {
    return this.goalsService.findAll(req.user.userId);
  }

  // POST /stats/me/goals
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @AuditLog('USER_CREATE_GOAL', 'UserGoal')
  create(@Req() req, @Body() dto: CreateGoalDto) {
    return this.goalsService.create(req.user.userId, dto);
  }

  // PATCH /stats/me/goals/:id
  @Patch(':id')
  @AuditLog('USER_UPDATE_GOAL', 'UserGoal')
  update(
    @Req() req,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGoalDto,
  ) {
    return this.goalsService.update(req.user.userId, id, dto);
  }

  // DELETE /stats/me/goals/:id
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @AuditLog('USER_DELETE_GOAL', 'UserGoal')
  remove(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.goalsService.remove(req.user.userId, id);
  }
}
