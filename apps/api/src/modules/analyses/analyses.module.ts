import { Module } from '@nestjs/common';
import { AnalysesService } from './analyses.service';
import { AnalysesController } from './analyses.controller';
import { AnalysisEngineService } from './analysis-engine.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { LlmCoachingService } from './llm-coaching.service';
import { AnalysesGateway } from './analyses.gateway';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [PrismaModule, ConfigModule, JwtModule],
  controllers: [AnalysesController],
  providers: [
    AnalysesService,
    AnalysisEngineService,
    LlmCoachingService,
    AnalysesGateway,
  ],
  exports: [AnalysesService],
})
export class AnalysesModule {}
