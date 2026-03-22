import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePitchTemplateDto,
  UpdatePitchTemplateDto,
} from './dto/pitch-template.dto';

@Injectable()
export class PitchTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.pitchTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.pitchTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async create(dto: CreatePitchTemplateDto) {
    return this.prisma.pitchTemplate.create({
      data: {
        title: dto.title,
        context: dto.context,
        content: dto.content,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdatePitchTemplateDto) {
    const template = await this.prisma.pitchTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    return this.prisma.pitchTemplate.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.context !== undefined && { context: dto.context }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async remove(id: string) {
    const template = await this.prisma.pitchTemplate.findUnique({
      where: { id },
    });
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.prisma.pitchTemplate.delete({ where: { id } });
    return { message: 'Template deleted successfully' };
  }
}
