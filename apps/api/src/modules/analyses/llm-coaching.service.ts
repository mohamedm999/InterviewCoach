import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context } from '@prisma/client';
import { LlmProviderUnavailableError } from './llm-provider.error';

interface LlmAnalysisResult {
  scores: {
    global: number;
    tone: number;
    confidence: number;
    readability: number;
    impact: number;
  };
  recommendations: Array<{
    category: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    title: string;
    description: string;
    examples: string[];
  }>;
  coachingFeedback: string;
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

  async analyzePitch(
    inputText: string,
    context: Context,
  ): Promise<LlmAnalysisResult> {
    if (!this.enabled) {
      throw new LlmProviderUnavailableError(
        'LLM coaching is disabled but is required for analysis creation. Please enable LLM_COACHING_ENABLED in environment variables.',
      );
    }

    if (this.provider !== 'openrouter') {
      throw new LlmProviderUnavailableError(
        `Unsupported LLM provider: ${this.provider}. Only openrouter is supported.`,
      );
    }

    if (!this.openRouterApiKey) {
      throw new LlmProviderUnavailableError(
        'OPENROUTER_API_KEY is not configured. LLM coaching is required for analysis creation.',
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
                content: `You are an expert interview coach. Analyze the candidate's response and provide structured feedback.

IMPORTANT: Detect and penalize nonsense text (repetition, lorem ipsum, random words, placeholder text).

CRITICAL: You MUST respond with ONLY valid JSON. No text before or after the JSON. Just pure JSON.

The JSON structure MUST be:
{
  "scores": {
    "global": 75,
    "tone": 80,
    "confidence": 70,
    "readability": 85,
    "impact": 70
  },
  "recommendations": [
    {
      "category": "CONFIDENCE",
      "priority": "MEDIUM",
      "title": "Improve confidence",
      "description": "Your description here",
      "examples": ["Example 1", "Example 2"]
    }
  ],
  "coachingFeedback": "One paragraph of personalized feedback here."
}

Scoring guidelines:
- Tone: Appropriateness for ${context.toLowerCase()} context, assertiveness vs hedging
- Confidence: Self-assurance, active voice, no hesitations  
- Readability: Clear structure, varied vocabulary, not repetitive
- Impact: Concrete achievements, metrics, action verbs
- Global: Weighted average

If text is nonsense/repetitive/placeholder, give scores below 40 and say so in feedback.

REMEMBER: ONLY JSON. NO OTHER TEXT.`,
              },
              {
                role: 'user',
                content: `Context: ${context}\n\nMy response:\n"${inputText}"`,
              },
            ],
            temperature: 0.3,
            max_tokens: 800, // Increased for longer JSON responses
            // Note: response_format removed - not supported by free models
            // Instead, we strongly instruct JSON in the prompt
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
          'OpenRouter returned an empty response',
          payload,
        );
      }

      this.logger.log(`Raw LLM response length: ${content?.length || 0} characters`);
      this.logger.log(`Raw LLM response (first 1000 chars): ${content?.substring(0, 1000) || 'empty'}`);
      
      // Log full response at debug level only
      this.logger.debug(`FULL RAW RESPONSE: ${content}`);

      // Parse JSON response - try to extract JSON from text
      let result: LlmAnalysisResult;
      try {
        // Try to parse directly first
        result = JSON.parse(content) as LlmAnalysisResult;
      } catch (parseError) {
        // If direct parse fails, try to extract JSON from text
        this.logger.warn('Direct JSON parse failed, trying to extract JSON from response...');
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]) as LlmAnalysisResult;
            this.logger.log('Successfully extracted JSON from response');
          } catch (extractError) {
            this.logger.error(`Failed to extract JSON: ${content}`);
            throw new LlmProviderUnavailableError(
              'OpenRouter returned invalid JSON response',
              payload,
            );
          }
        } else {
          this.logger.error(`No JSON found in response. Model returned: ${content}`);
          throw new LlmProviderUnavailableError(
            'OpenRouter returned invalid JSON response - no JSON structure found. Check logs for full response.',
            payload,
          );
        }
      }

      // Validate structure
      if (!result.scores || !result.recommendations || !result.coachingFeedback) {
        throw new LlmProviderUnavailableError(
          'OpenRouter returned invalid response structure - missing required fields',
          payload,
        );
      }

      // Normalize category values to match our enum
      const validCategories = ['TONE', 'CONFIDENCE', 'READABILITY', 'IMPACT', 'STRUCTURE', 'GENERAL'];
      for (const rec of result.recommendations) {
        // Map invalid categories to GENERAL
        if (!validCategories.includes(rec.category)) {
          this.logger.warn(`Mapping unknown category "${rec.category}" to GENERAL`);
          rec.category = 'GENERAL';
        }
      }

      return result;
    } catch (error) {
      if (error instanceof LlmProviderUnavailableError) {
        throw error;
      }

      if (error instanceof SyntaxError) {
        this.logger.warn('OpenRouter returned invalid JSON');
        throw new LlmProviderUnavailableError(
          'OpenRouter returned invalid JSON response',
          error,
        );
      }

      this.logger.warn(
        `OpenRouter analysis request failed for model ${this.model}`,
      );
      throw new LlmProviderUnavailableError(
        'OpenRouter analysis is unavailable',
        error,
      );
    }
  }

  // ─── Deprecated: Keep for backward compatibility ──────────────────────────

  async generateCoaching(
    inputText: string,
    context: Context,
    scores: any,
  ): Promise<string> {
    const result = await this.analyzePitch(inputText, context);
    return result.coachingFeedback;
  }
}
