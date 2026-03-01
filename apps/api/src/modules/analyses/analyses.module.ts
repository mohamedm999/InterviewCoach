import { Module } from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { AnalysesController } from './analyses.controller';
import { AnalysisEngineService } from './analysis-engine.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LlmCoachingService } from './llm-coaching.service';
import { AnalysesGateway } from './analyses.gateway';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [AnalysesController],
  providers: [AnalysesService, AnalysisEngineService, LlmCoachingService, AnalysesGateway],
  exports: [AnalysesService],
})
export class AnalysesModule {}
