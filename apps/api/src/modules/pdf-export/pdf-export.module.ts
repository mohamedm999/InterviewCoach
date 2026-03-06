import { Module } from '@nestjs/common';
import { PdfExportController } from './pdf-export.controller';
import { PdfExportService } from './pdf-export.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PdfExportController],
  providers: [PdfExportService],
  exports: [PdfExportService],
})
export class PdfExportModule {}
