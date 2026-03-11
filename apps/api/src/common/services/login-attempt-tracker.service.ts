import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Tracks login attempts for brute force protection
 * Stores attempt count and lock status in memory(for production, use Redis)
 */
@Injectable()
export class LoginAttemptTrackerService {
  // In-memory storage for login attempts (use Redis in production)
  private attempts = new Map<string, { count: number; lastAttempt: Date }>();
  private lockedAccounts = new Map<string, Date>();

  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes
  private readonly LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes lockout

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a failed login attempt
   * @param identifier - Email or IP address
   * @returns Current attempt count
   */
  recordFailedAttempt(identifier: string): number {
    const now = new Date();
    const existing = this.attempts.get(identifier);

    if (
      !existing ||
      now.getTime() - existing.lastAttempt.getTime() > this.WINDOW_MS
    ) {
      // First attempt or window expired
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return 1;
    }

    // Increment counter within window
    const newCount = existing.count + 1;
    this.attempts.set(identifier, { count: newCount, lastAttempt: now });

    // Lock account if max attempts exceeded
    if (newCount >= this.MAX_ATTEMPTS) {
      this.lockAccount(identifier);
    }

    return newCount;
  }

  /**
   * Check if account/IP is locked
   * @param identifier - Email or IP address
   * @returns true if locked
   */
  isLocked(identifier: string): boolean {
    const lockExpiry = this.lockedAccounts.get(identifier);
    if (!lockExpiry) return false;

    // Check if lock has expired
    if (new Date().getTime() > lockExpiry.getTime()) {
      this.unlockAccount(identifier);
      return false;
    }

    return true;
  }

  /**
   * Reset attempts on successful login
   * @param identifier - Email or IP address
   */
  resetAttempts(identifier: string): void {
    this.attempts.delete(identifier);
    this.unlockAccount(identifier);
  }

  /**
   * Get remaining attempts before lockout
   * @param identifier - Email or IP address
   * @returns Number of remaining attempts
   */
  getRemainingAttempts(identifier: string): number {
    const existing = this.attempts.get(identifier);
    if (!existing) return this.MAX_ATTEMPTS;

    // Check if window expired
    if (
      new Date().getTime() - existing.lastAttempt.getTime() >
      this.WINDOW_MS
    ) {
      return this.MAX_ATTEMPTS;
    }

    return Math.max(0, this.MAX_ATTEMPTS - existing.count);
  }

  /**
   * Lock an account temporarily
   */
  private lockAccount(identifier: string): void {
    const lockUntil = new Date(Date.now() + this.LOCK_DURATION_MS);
    this.lockedAccounts.set(identifier, lockUntil);

    // Log to audit trail
    console.warn(
      `[Security] Account locked due to brute force: ${identifier} until ${lockUntil.toISOString()}`,
    );
  }

  /**
   * Unlock an account
   */
  private unlockAccount(identifier: string): void {
    this.lockedAccounts.delete(identifier);
  }

  /**
   * Clean up old entries (call periodically)
   */
  cleanup(): void {
    const now = new Date().getTime();

    // Clean old attempts
    for (const [key, value] of this.attempts.entries()) {
      if (now - value.lastAttempt.getTime() > this.WINDOW_MS) {
        this.attempts.delete(key);
      }
    }

    // Clean expired locks
    for (const [key, value] of this.lockedAccounts.entries()) {
      if (now > value.getTime()) {
        this.lockedAccounts.delete(key);
      }
    }
  }
}
