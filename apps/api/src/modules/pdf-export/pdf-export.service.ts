import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role, Analysis, Recommendation } from '@prisma/client';
import { activeAnalysisWhere } from '../analyses/analysis.where';

// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-unsafe-assignment
const PdfPrinter = require('pdfmake/js/Printer');

type AnalysisWithRelations = Analysis & {
  recommendations: Recommendation[];
  user: { email: string; displayName: string | null } | null;
};

@Injectable()
export class PdfExportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateAnalysisPdf(
    analysisId: string,
    requestingUserId: string,
    requestingUserRole: Role,
  ): Promise<Buffer> {
    const analysis = await this.prisma.analysis.findFirst({
      where: activeAnalysisWhere({ id: analysisId }),
      include: {
        recommendations: true,
        user: { select: { email: true, displayName: true } },
      },
    });

    if (!analysis) {
      throw new NotFoundException('Analysis not found');
    }

    if (
      analysis.userId !== requestingUserId &&
      requestingUserRole !== Role.ADMIN
    ) {
      throw new ForbiddenException('Access denied');
    }

    const docDefinition = this.buildDocDefinition(
      analysis as AnalysisWithRelations,
    );

    return this.generatePdfBuffer(docDefinition);
  }

  private buildDocDefinition(
    analysis: AnalysisWithRelations,
  ): Record<string, unknown> {
    const priorityColors: Record<string, string> = {
      HIGH: '#ef4444',
      MEDIUM: '#f59e0b',
      LOW: '#10b981',
    };

    const recommendationRows = analysis.recommendations.map(
      (rec: Recommendation) => [
        { text: rec.title ?? '', bold: true },
        rec.category ?? '',
        {
          text: rec.priority ?? '',
          color: priorityColors[rec.priority] || '#000',
        },
        rec.description ?? '',
      ],
    );

    return {
      content: [
        { text: 'InterviewCoach — Analysis Report', style: 'header' },
        {
          text: `Generated: ${new Date().toLocaleDateString()}`,
          style: 'subheader',
        },
        { text: ' ' },

        {
          text: `User: ${analysis.user?.displayName || analysis.user?.email || 'N/A'}`,
          style: 'info',
        },
        { text: `Context: ${analysis.context}`, style: 'info' },
        { text: `Version: ${analysis.versionIndex}`, style: 'info' },
        {
          text: `Date: ${new Date(analysis.createdAt).toLocaleDateString()}`,
          style: 'info',
        },
        { text: ' ' },

        { text: 'Scores', style: 'sectionHeader' },
        {
          table: {
            widths: ['*', '*'],
            body: [
              [
                { text: 'Category', bold: true },
                { text: 'Score', bold: true },
              ],
              ['Global', `${analysis.scoreGlobal}/100`],
              ['Tone', `${analysis.scoreTone}/100`],
              ['Confidence', `${analysis.scoreConfidence}/100`],
              ['Readability', `${analysis.scoreReadability}/100`],
              ['Impact', `${analysis.scoreImpact}/100`],
            ],
          },
          layout: 'lightHorizontalLines',
        },
        { text: ' ' },

        { text: 'Original Text', style: 'sectionHeader' },
        {
          text: analysis.inputText
            ? analysis.inputText.substring(0, 2000)
            : 'N/A',
          style: 'body',
        },
        { text: ' ' },

        { text: 'Recommendations', style: 'sectionHeader' },
        analysis.recommendations.length > 0
          ? {
              table: {
                headerRows: 1,
                widths: ['auto', 'auto', 'auto', '*'],
                body: [
                  [
                    { text: 'Title', bold: true },
                    { text: 'Category', bold: true },
                    { text: 'Priority', bold: true },
                    { text: 'Description', bold: true },
                  ],
                  ...recommendationRows,
                ],
              },
              layout: 'lightHorizontalLines',
            }
          : { text: 'No recommendations generated.', italics: true },
      ],
      styles: {
        header: { fontSize: 20, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 12, color: '#666', margin: [0, 0, 0, 5] },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          margin: [0, 10, 0, 5],
        },
        info: { fontSize: 10, margin: [0, 2, 0, 2] },
        body: { fontSize: 10, margin: [0, 5, 0, 5] },
      },
      defaultStyle: {
        font: 'Helvetica',
      },
    };
  }

  private generatePdfBuffer(
    docDefinition: Record<string, unknown>,
  ): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const fonts = {
        Helvetica: {
          normal: 'Helvetica',
          bold: 'Helvetica-Bold',
          italics: 'Helvetica-Oblique',
          bolditalics: 'Helvetica-BoldOblique',
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
      const printer = new PdfPrinter(fonts);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const pdfDoc = printer.createPdfKitDocument(docDefinition);
      const chunks: Buffer[] = [];

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      pdfDoc.on('data', (chunk: Buffer) => chunks.push(chunk));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      pdfDoc.on('error', (err: Error) => reject(err));
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      pdfDoc.end();
    });
  }
}
