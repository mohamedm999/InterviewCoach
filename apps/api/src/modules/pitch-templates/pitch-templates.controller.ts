import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { PitchTemplatesService } from './pitch-templates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuditLog } from '../../common/decorators/audit-log.decorator';
import { Role } from '@prisma/client';
import {
  CreatePitchTemplateDto,
  UpdatePitchTemplateDto,
} from './dto/pitch-template.dto';

@Controller('pitch-templates')
@UseGuards(JwtAuthGuard)
export class PitchTemplatesController {
  constructor(private readonly pitchTemplatesService: PitchTemplatesService) {}

  // GET /pitch-templates - Get all active templates (for users)
  @Get()
  findAll() {
    return this.pitchTemplatesService.findAll();
  }

  // GET /pitch-templates/:id
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.pitchTemplatesService.findOne(id);
  }

  // POST /pitch-templates - Admin only
  @Post()
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @AuditLog('ADMIN_CREATE_TEMPLATE', 'PitchTemplate')
  create(@Body() dto: CreatePitchTemplateDto) {
    return this.pitchTemplatesService.create(dto);
  }

  // PATCH /pitch-templates/:id - Admin only
  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @AuditLog('ADMIN_UPDATE_TEMPLATE', 'PitchTemplate')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePitchTemplateDto,
  ) {
    return this.pitchTemplatesService.update(id, dto);
  }

  // DELETE /pitch-templates/:id - Admin only
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @AuditLog('ADMIN_DELETE_TEMPLATE', 'PitchTemplate')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.pitchTemplatesService.remove(id);
  }
}
