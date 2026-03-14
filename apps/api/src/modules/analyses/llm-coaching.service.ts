import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context } from '@prisma/client';
import { LlmProviderUnavailableError } from './llm-provider.error';

interface CoachingScores {
  global: number;
  tone: number;
  confidence: number;
  readability: number;
  impact: number;
}

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

@Injectable()
export class LlmCoachingService {
  private readonly logger = new Logger(LlmCoachingService.name);
  private readonly enabled: boolean;
  private readonly provider: 'openrouter';
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly openRouterApiKey?: string;
  private readonly openRouterBaseUrl: string;
  private readonly appUrl: string;
  private readonly appName: string;

  constructor(private configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('llm.enabled') ?? false;
    this.provider =
      this.configService.get<'openrouter'>('llm.provider') ?? 'openrouter';
    this.model =
      this.configService.get<string>('llm.model') || 'openai/gpt-4o-mini';
    this.timeoutMs = this.configService.get<number>('llm.timeoutMs') ?? 10000;
    this.openRouterApiKey =
      this.configService.get<string>('llm.openrouter.apiKey') ||
      this.configService.get<string>('OPENROUTER_API_KEY');
    this.openRouterBaseUrl =
      this.configService.get<string>('llm.openrouter.baseUrl') ||
      'https://openrouter.ai/api/v1';
    this.appUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3001';
    this.appName =
      this.configService.get<string>('APP_NAME') || 'InterviewCoach';

    if (!this.enabled) {
      this.logger.warn('LLM coaching is disabled by configuration.');
    } else if (!this.openRouterApiKey) {
      this.logger.warn(
        'LLM coaching is enabled but OPENROUTER_API_KEY is not configured.',
      );
    } else {
      this.logger.log(
        `LLM coaching configured with ${this.provider}:${this.model}.`,
      );
    }
  }

  async generateCoaching(
    inputText: string,
    context: Context,
    scores: CoachingScores,
  ): Promise<string> {
    if (!this.enabled) {
      throw new LlmProviderUnavailableError('LLM coaching is disabled');
    }

    if (this.provider !== 'openrouter') {
      throw new LlmProviderUnavailableError(
        `Unsupported LLM provider: ${this.provider}`,
      );
    }

    if (!this.openRouterApiKey) {
      throw new LlmProviderUnavailableError(
        'OpenRouter API key is not configured',
      );
    }

    try {
      const response = await fetch(
        `${this.openRouterBaseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': this.appUrl,
            'X-Title': this.appName,
          },
          body: JSON.stringify({
            model: this.model,
            messages: [
              {
                role: 'system',
                content: `You are an expert interview coach analyzing a candidate's response in a ${context.toLowerCase()} context. Given their response and their rule-based scores, provide one concise, encouraging paragraph of qualitative feedback on how they can improve.`,
              },
              {
                role: 'user',
                content: `Response:\n"${inputText}"\n\nScores (out of 100):\nOverall: ${scores.global}\nTone: ${scores.tone}\nConfidence: ${scores.confidence}\nReadability: ${scores.readability}\nImpact: ${scores.impact}`,
              },
            ],
            temperature: 0.7,
            max_tokens: 150,
          }),
          signal: AbortSignal.timeout(this.timeoutMs),
        },
      );

      const payload = (await response.json()) as OpenRouterChatResponse;

      if (!response.ok) {
        throw new LlmProviderUnavailableError(
          payload.error?.message || 'OpenRouter request failed',
          payload,
        );
      }

      const content = payload.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new LlmProviderUnavailableError(
          'OpenRouter returned an empty coaching response',
          payload,
        );
      }

      return content;
    } catch (error) {
      if (error instanceof LlmProviderUnavailableError) {
        throw error;
      }

      this.logger.warn(
        `OpenRouter coaching request failed for model ${this.model}`,
      );
      throw new LlmProviderUnavailableError(
        'OpenRouter coaching is unavailable',
        error,
      );
    }
  }
}
