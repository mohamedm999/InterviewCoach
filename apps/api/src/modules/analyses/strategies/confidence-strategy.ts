import { Injectable } from '@nestjs/common';

@Injectable()
export class ConfidenceStrategy {
  compute(text: string): number {
    let score = 50; // Base score

    // Confidence indicators
    const confidentPhrases = [
      'i am confident',
      'i believe',
      'i know',
      'i will',
      'i can',
      'definitely',
      'certainly',
      'absolutely',
    ];

    const uncertainPhrases = [
      'i think',
      'maybe',
      'perhaps',
      'possibly',
      'i guess',
      'kind of',
      'sort of',
      'probably',
      'might',
    ];

    const lowerText = text.toLowerCase();

    // Count confident phrases
    confidentPhrases.forEach(phrase => {
      const count = (lowerText.match(new RegExp(phrase, 'g')) || []).length;
      score += count * 5;
    });

    // Count uncertain phrases
    uncertainPhrases.forEach(phrase => {
      const count = (lowerText.match(new RegExp(phrase, 'g')) || []).length;
      score -= count * 5;
    });

    // Check for exclamation marks (shows enthusiasm)
    const exclamationCount = (text.match(/!/g) || []).length;
    score += Math.min(exclamationCount * 2, 10);

    // Check for question marks (can indicate uncertainty)
    const questionCount = (text.match(/\?/g) || []).length;
    score -= Math.min(questionCount * 2, 10);

    // Ensure score is within 0-100 range
    return Math.max(0, Math.min(100, score));
  }
}
