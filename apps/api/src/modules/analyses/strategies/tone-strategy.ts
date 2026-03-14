import { Injectable } from '@nestjs/common';
import { Context } from '@prisma/client';

@Injectable()
export class ToneStrategy {
  compute(text: string, context: Context): number {
    // Tone scoring logic based on context
    const words = text.toLowerCase().split(/\s+/);
    let score = 50; // Base score

    // Context-specific keywords
    const contextKeywords: Record<
      Context,
      { positive: string[]; negative: string[] }
    > = {
      FORMAL: {
        positive: [
          'professional',
          'respectfully',
          'sincerely',
          'appreciate',
          'grateful',
          'honored',
        ],
        negative: ['yeah', 'gonna', 'wanna', 'kinda', 'sorta', 'stuff'],
      },
      STARTUP: {
        positive: [
          'innovative',
          'disrupt',
          'scale',
          'growth',
          'agile',
          'pivot',
          'passionate',
        ],
        negative: ['traditional', 'slow', 'bureaucratic', 'rigid'],
      },
      TECHNICAL: {
        positive: [
          'implement',
          'optimize',
          'architecture',
          'scalable',
          'efficient',
          'robust',
        ],
        negative: ['maybe', 'probably', 'guess', 'think'],
      },
      CREATIVE: {
        positive: [
          'creative',
          'innovative',
          'unique',
          'original',
          'inspiring',
          'vision',
        ],
        negative: ['boring', 'standard', 'typical', 'ordinary'],
      },
    };

    const keywords = contextKeywords[context];

    // Count positive and negative keywords
    let positiveCount = 0;
    let negativeCount = 0;

    words.forEach((word) => {
      if (keywords.positive.includes(word)) positiveCount++;
      if (keywords.negative.includes(word)) negativeCount++;
    });

    // Adjust score based on keyword presence
    score += positiveCount * 5;
    score -= negativeCount * 5;

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  }
}
