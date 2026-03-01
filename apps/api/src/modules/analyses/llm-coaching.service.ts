import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AnalysisResponseDto } from './dto/analysis-response.dto';
import { Context } from '@prisma/client';

@Injectable()
export class LlmCoachingService {
  private readonly logger = new Logger(LlmCoachingService.name);
  private openai: OpenAI | null = null;
  private isConfigured = false;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.isConfigured = true;
      this.logger.log('OpenAI client initialized for LLM coaching.');
    } else {
      this.logger.warn(
        'OPENAI_API_KEY not found in environment variables. Falling back to mock coaching mode.',
      );
    }
  }

  async generateCoaching(
    inputText: string,
    context: Context,
    scores: { global: number; tone: number; confidence: number; readability: number; impact: number },
  ): Promise<string> {
    if (!this.isConfigured || !this.openai) {
      return this.getMockCoaching(context, scores.global);
    }

    try {
      this.logger.debug('Calling OpenAI to generate coaching feedback...');
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are an expert interview coach analyzing a candidate's response in a ${context.toLowerCase()} context. Given their response and their rule-based scores, provide one concise, encouraging paragraph of qualitative feedback on how they can improve.`
          },
          {
            role: 'user',
            content: `Response:\n"${inputText}"\n\nScores (out of 100):\nOverall: ${scores.global}\nTone: ${scores.tone}\nConfidence: ${scores.confidence}\nReadability: ${scores.readability}\nImpact: ${scores.impact}`
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content || this.getMockCoaching(context, scores.global);
    } catch (error) {
      this.logger.error('Failed to generate LLM coaching', error);
      return this.getMockCoaching(context, scores.global);
    }
  }

  private getMockCoaching(context: Context, globalScore: number): string {
    if (globalScore >= 80) {
      return `This is a strong response for a ${context.toLowerCase()} setting. Keep up the good work! You convey confidence and clarity. (Note: Add OPENAI_API_KEY to .env for AI-generated feedback).`;
    } else if (globalScore >= 60) {
      return `Your response shows potential for a ${context.toLowerCase()} interview, but there's room for improvement. Try to focus on stronger action verbs and clearer sentences. (Note: Add OPENAI_API_KEY to .env for AI-generated feedback).`;
    } else {
      return `Your response needs some work to fit a ${context.toLowerCase()} interview context. We recommend breaking down your points and practicing your delivery. (Note: Add OPENAI_API_KEY to .env for AI-generated feedback).`;
    }
  }
}
