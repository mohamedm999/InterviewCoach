import { Injectable } from '@nestjs/common';

@Injectable()
export class ImpactStrategy {
  compute(text: string): number {
    let score = 50; // Base score

    // Impact keywords (action-oriented, results-focused)
    const impactKeywords = [
      'achieved',
      'improved',
      'increased',
      'reduced',
      'delivered',
      'created',
      'developed',
      'led',
      'managed',
      'implemented',
      'launched',
      'optimized',
      'transformed',
      'generated',
      'saved',
      'revenue',
      'growth',
      'success',
      'results',
      'impact',
    ];

    const lowerText = text.toLowerCase();
    const words = lowerText.split(/\s+/);

    // Count impact keywords
    let impactCount = 0;
    impactKeywords.forEach((keyword) => {
      if (words.includes(keyword)) {
        impactCount++;
      }
    });

    score += impactCount * 3;

    // Check for quantifiable results (numbers/percentages)
    const numberMatches = text.match(
      /\d+%|\d+\s*(percent|million|thousand|billion)/gi,
    );
    if (numberMatches) {
      score += numberMatches.length * 5;
    }

    // Check for specific examples (use of "for example", "such as", etc.)
    const examplePhrases = [
      'for example',
      'such as',
      'for instance',
      'specifically',
    ];
    examplePhrases.forEach((phrase) => {
      if (lowerText.includes(phrase)) {
        score += 5;
      }
    });

    // Check for storytelling elements (problem-solution structure)
    const hasChallenge = /challenge|problem|issue|difficulty/i.test(text);
    const hasSolution = /solution|resolved|solved|addressed/i.test(text);
    const hasResult = /result|outcome|impact|achievement/i.test(text);

    if (hasChallenge && hasSolution) score += 10;
    if (hasSolution && hasResult) score += 10;

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  }
}
