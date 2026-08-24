import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp in milliseconds or seconds
}

let ratelimitInstance: Ratelimit | null = null;

// Fallback in-memory rate limiter for development/test environments where Upstash credentials are not configured
class InMemoryRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private max: number;
  private windowMs: number;

  constructor(max = 10, windowMs = 60 * 1000) {
    this.max = max;
    this.windowMs = windowMs;
  }

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let timestamps = this.requests.get(identifier) || [];
    timestamps = timestamps.filter((t) => t > windowStart);

    if (timestamps.length >= this.max) {
      const oldest = timestamps[0];
      const reset = oldest + this.windowMs;
      return {
        success: false,
        limit: this.max,
        remaining: 0,
        reset,
      };
    }

    timestamps.push(now);
    this.requests.set(identifier, timestamps);

    return {
      success: true,
      limit: this.max,
      remaining: this.max - timestamps.length,
      reset: now + this.windowMs,
    };
  }
}

const fallbackLimiter = new InMemoryRateLimiter(10, 60 * 1000);

export function getRatelimit(): Ratelimit | null {
  if (ratelimitInstance) return ratelimitInstance;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    const redis = new Redis({
      url,
      token,
    });

    ratelimitInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60s"),
      analytics: true,
      prefix: "cms_ratelimit",
    });

    return ratelimitInstance;
  }

  return null;
}

/**
 * Extracts client IP address from standard request headers.
 */
export function getClientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const ips = xff.split(",").map((ip) => ip.trim());
    if (ips[0]) return ips[0];
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "127.0.0.1";
}

/**
 * Checks rate limit for a given identifier using Upstash Redis if configured,
 * or fallback in-memory sliding window limiter otherwise.
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const ratelimit = getRatelimit();
  if (ratelimit) {
    const result = await ratelimit.limit(identifier);
    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  }

  return fallbackLimiter.limit(identifier);
}

/**
 * Builds standard rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, Retry-After).
 */
export function getRateLimitHeaders(result: RateLimitResult): HeadersInit {
  const nowMs = Date.now();
  // reset can be timestamp in ms or seconds
  const resetMs = result.reset > 1e11 ? result.reset : result.reset * 1000;
  const retryAfterSeconds = Math.max(1, Math.ceil((resetMs - nowMs) / 1000));

  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(resetMs / 1000)),
    "Retry-After": String(retryAfterSeconds),
  };
}

/**
 * Helper to construct a standard 429 Too Many Requests response with standard headers.
 */
export function rateLimitExceededResponse(result: RateLimitResult): NextResponse {
  const headers = getRateLimitHeaders(result);
  return NextResponse.json(
    { error: "Too Many Requests" },
    {
      status: 429,
      headers,
    }
  );
}
