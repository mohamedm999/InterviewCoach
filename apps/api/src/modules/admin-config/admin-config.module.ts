import { Module } from '@nestjs/common';
import { AdminConfigService } from './admin-config.service';
import { AdminConfigController } from './admin-config.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AdminConfigController],
  providers: [AdminConfigService],
  exports: [AdminConfigService],
})
export class AdminConfigModule {}
