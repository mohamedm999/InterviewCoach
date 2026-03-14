import { Injectable } from '@nestjs/common';

@Injectable()
export class ReadabilityStrategy {
  compute(text: string): number {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const syllables = this.countSyllables(text);

    if (sentences.length === 0 || words.length === 0) {
      return 50; // Default score for empty text
    }

    // Calculate Flesch Reading Ease Score
    const avgWordsPerSentence = words.length / sentences.length;
    const avgSyllablesPerWord = syllables / words.length;

    const fleschScore =
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;

    // Convert Flesch score (0-100) to our score (0-100)
    // Flesch: 90-100 = Very Easy, 0-30 = Very Difficult
    let score = Math.max(0, Math.min(100, fleschScore));

    // Adjust for sentence length (penalize very long sentences)
    if (avgWordsPerSentence > 25) {
      score -= 10;
    } else if (avgWordsPerSentence > 20) {
      score -= 5;
    }

    // Adjust for very short sentences (might be too choppy)
    if (avgWordsPerSentence < 8) {
      score -= 5;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private countSyllables(text: string): number {
    const words = text.toLowerCase().split(/\s+/);
    let totalSyllables = 0;

    words.forEach((word) => {
      // Remove non-alphabetic characters
      word = word.replace(/[^a-z]/g, '');
      if (word.length === 0) return;

      // Count vowel groups
      const vowelGroups = word.match(/[aeiouy]+/g);
      let syllableCount = vowelGroups ? vowelGroups.length : 0;

      // Adjust for silent 'e'
      if (word.endsWith('e') && syllableCount > 1) {
        syllableCount--;
      }

      // Minimum of 1 syllable per word
      totalSyllables += Math.max(1, syllableCount);
    });

    return totalSyllables;
  }
}
