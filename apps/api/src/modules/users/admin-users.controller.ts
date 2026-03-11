import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { AdminUpdateStatusDto } from './dto/admin-update-status.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /admin/users
  @Get()
  findAll(@Query() query: PaginationQueryDto): Promise<{
    data: UserResponseDto[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    return this.usersService.findAll(query);
  }

  // PATCH /admin/users/:id/status
  @Patch(':id/status')
  @AuditLog('ADMIN_UPDATE_USER_STATUS', 'User')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: AdminUpdateStatusDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateStatus(id, dto.status);
  }
}
