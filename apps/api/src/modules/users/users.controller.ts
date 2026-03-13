import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UpdateProfileDto, ChangePasswordDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AuditLog } from '../../common/decorators/audit-log.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users/me
  @Get('me')
  getMe(@Req() req): Promise<UserResponseDto> {
    return this.usersService.findOne(req.user.userId);
  }

  // PATCH /users/me
  @Patch('me')
  @AuditLog('USER_UPDATE_PROFILE', 'User')
  updateMe(
    @Req() req,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    return this.usersService.updateProfile(req.user.userId, dto);
  }

  // POST /users/me/change-password
  @Post('me/change-password')
  @AuditLog('USER_CHANGE_PASSWORD', 'User')
  async changePassword(@Req() req, @Body() dto: ChangePasswordDto) {
    await this.usersService.changePassword(req.user.userId, dto);
    return { message: 'Password changed successfully' };
  }
}
