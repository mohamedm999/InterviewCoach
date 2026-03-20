import {
  Controller,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { PdfExportService } from './pdf-export.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('analyses')
@UseGuards(JwtAuthGuard)
export class PdfExportController {
  constructor(private readonly pdfExportService: PdfExportService) {}

  @Post(':id/pdf')
  async generatePdf(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const pdfBuffer = await this.pdfExportService.generateAnalysisPdf(
      id,
      req.user.userId,
      req.user.role,
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="analysis-${id}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });

    return new StreamableFile(pdfBuffer);
  }
}
