import { Module } from '@nestjs/common';
import { PitchTemplatesController } from './pitch-templates.controller';
import { PitchTemplatesService } from './pitch-templates.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PitchTemplatesController],
  providers: [PitchTemplatesService],
  exports: [PitchTemplatesService],
})
export class PitchTemplatesModule {}
