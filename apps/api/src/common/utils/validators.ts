/**
 * Validation utilities for score ranges and configuration weights
 * Ensures data integrity for analysis scores and config weights
 */

import { BadRequestException } from '@nestjs/common';

/**
 * Validates that a score is within the valid range (0-100)
 * @param score - The score to validate
 * @param fieldName - Name of the score field for error messages
 * @throws BadRequestException if score is out of range
 */
export function validateScoreRange(score: number, fieldName: string): void {
  if (typeof score !== 'number' || isNaN(score)) {
    throw new BadRequestException(`${fieldName} must be a number`);
  }

  if (score < 0 || score > 100) {
    throw new BadRequestException(`${fieldName} must be between 0 and 100`);
  }
}

/**
 * Validates all analysis scores are within valid range (0-100)
 * @param scores - Object containing all score fields
 * @throws BadRequestException if any score is invalid
 */
export function validateAnalysisScores(scores: {
  scoreGlobal: number;
  scoreTone: number;
  scoreConfidence: number;
  scoreReadability: number;
  scoreImpact: number;
}): void {
  const scoreEntries = Object.entries(scores);

  for (const [fieldName, score] of scoreEntries) {
    validateScoreRange(score, fieldName);
  }
}

/**
 * Validates that configuration weights sum to exactly 100
 * @param weights - Object with weight values (e.g., { tone: 25, confidence: 25, ... })
 * @throws BadRequestException if weights don't sum to 100
 */
export function validateWeightsSum(weights: Record<string, number>): void {
  const values = Object.values(weights);

  // Check all values are numbers
  for (const value of values) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new BadRequestException('All weights must be numbers');
    }

    if (value < 0) {
      throw new BadRequestException('Weights cannot be negative');
    }
  }

  const sum = values.reduce((acc, val) => acc + val, 0);

  // Allow small floating point tolerance
  if (Math.abs(sum - 100) > 0.01) {
    throw new BadRequestException(
      `Weights must sum to 100 (current sum: ${sum})`,
    );
  }
}

/**
 * Validates UserGoal target score
 * @param targetScore - The target score to validate
 * @throws BadRequestException if score is out of range
 */
export function validateGoalTargetScore(targetScore: number): void {
  validateScoreRange(targetScore, 'targetScore');
}

/**
 * Interface for threshold validation
 */
export interface ThresholdConfig {
  high: number;
  medium: number;
}

/**
 * Validates threshold configuration
 * @param thresholds - Object with high and medium thresholds
 * @throws BadRequestException if thresholds are invalid
 */
export function validateThresholds(thresholds: ThresholdConfig): void {
  if (!thresholds.high || !thresholds.medium) {
    throw new BadRequestException(
      'Both high and medium thresholds are required',
    );
  }

  if (thresholds.high <= thresholds.medium) {
    throw new BadRequestException(
      'High threshold must be greater than medium threshold',
    );
  }

  if (thresholds.high > 100 || thresholds.medium < 0) {
    throw new BadRequestException('Thresholds must be between 0 and 100');
  }
}
