import { SetMetadata } from '@nestjs/common';

export const THROTTLE_KEY = 'throttle';

/**
 * Custom throttle decorator for per-endpoint rate limiting
 * @param limit - Number of requests allowed
 * @param ttl - Time to live in seconds
 * @example @Throttle(5, 60) // 5 requests per minute
 */
export const Throttle = (limit: number, ttl: number) =>
  SetMetadata(THROTTLE_KEY, { limit, ttl });
