import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client
// For production, use Upstash Redis (serverless, free tier available)
// For local dev, can use local Redis or in-memory cache
let redis: Redis | null = null;
let ratelimit: Ratelimit | null = null;

// Initialize Redis connection
export function getRedisClient(): Redis | null {
  if (redis) return redis;

  try {
    // Check if Upstash credentials are available
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log('✅ Redis client initialized (Upstash)');
      return redis;
    } else {
      console.warn('⚠️ Redis credentials not found. Caching disabled.');
      console.log('💡 Add UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to .env.local');
      return null;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Redis:', error);
    return null;
  }
}

// Initialize rate limiter
export function getRateLimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit;

  const redisClient = getRedisClient();
  if (!redisClient) {
    console.warn('⚠️ Rate limiting disabled (Redis not available)');
    return null;
  }

  try {
    ratelimit = new Ratelimit({
      redis: redisClient,
      limiter: Ratelimit.slidingWindow(2, '1 m'), // 2 requests per minute
      analytics: true,
      prefix: '@ratelimit/ai-analysis',
    });
    console.log('✅ Rate limiter initialized (2 req/min)');
    return ratelimit;
  } catch (error) {
    console.error('❌ Failed to initialize rate limiter:', error);
    return null;
  }
}

// Cache utilities
export const CacheKeys = {
  imageAnalysis: (hash: string) => `ai:analysis:${hash}`,
  userRateLimit: (userId: string) => `ratelimit:${userId}`,
};

// Cache TTL configurations (in seconds)
export const CacheTTL = {
  imageAnalysis: 60 * 60 * 24 * 7, // 7 days (similar images won't change)
  rateLimit: 60, // 1 minute
};

// Helper to generate hash from image buffers for cache key
export async function generateImageHash(imageBuffers: Buffer[]): Promise<string> {
  const crypto = await import('crypto');
  const hash = crypto.createHash('sha256');
  
  // Hash all image buffers together
  imageBuffers.forEach(buffer => {
    hash.update(buffer);
  });
  
  return hash.digest('hex');
}

// Get cached analysis result
export async function getCachedAnalysis(hash: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cached = await redis.get<string>(CacheKeys.imageAnalysis(hash));
    if (cached) {
      console.log('✅ Cache hit for image analysis:', hash.substring(0, 16) + '...');
      return cached;
    }
    console.log('❌ Cache miss for image analysis');
    return null;
  } catch (error) {
    console.error('❌ Redis get error:', error);
    return null;
  }
}

// Set cached analysis result
export async function setCachedAnalysis(hash: string, description: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(
      CacheKeys.imageAnalysis(hash),
      description,
      {
        ex: CacheTTL.imageAnalysis,
      }
    );
    console.log('✅ Cached analysis result for:', hash.substring(0, 16) + '...');
  } catch (error) {
    console.error('❌ Redis set error:', error);
  }
}

// Check rate limit for a user/IP
export async function checkRateLimit(identifier: string): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const limiter = getRateLimiter();
  
  if (!limiter) {
    // If rate limiting is disabled, allow all requests
    return {
      success: true,
      limit: 2,
      remaining: 2,
      reset: Date.now() + 60000,
    };
  }

  try {
    const result = await limiter.limit(identifier);
    
    console.log(`🔒 Rate limit check for ${identifier}:`, {
      success: result.success,
      remaining: result.remaining,
      reset: new Date(result.reset).toISOString(),
    });

    return {
      success: result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (error) {
    console.error('❌ Rate limit check error:', error);
    // On error, allow the request but log it
    return {
      success: true,
      limit: 2,
      remaining: 1,
      reset: Date.now() + 60000,
    };
  }
}

// In-memory LRU cache as fallback (for when Redis is unavailable)
import { LRUCache } from 'lru-cache';

const memoryCache = new LRUCache<string, string>({
  max: 100, // Maximum 100 items in memory
  ttl: 1000 * 60 * 60, // 1 hour TTL
  updateAgeOnGet: true,
});

export function getMemoryCachedAnalysis(hash: string): string | undefined {
  return memoryCache.get(hash);
}

export function setMemoryCachedAnalysis(hash: string, description: string): void {
  memoryCache.set(hash, description);
}

// Clear cache (useful for testing or admin operations)
export async function clearCache(): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    memoryCache.clear();
    console.log('✅ Memory cache cleared');
    return;
  }

  try {
    // Note: Upstash Redis doesn't support SCAN, so we'll just log
    console.log('⚠️ Cache clearing not implemented for Upstash Redis');
    console.log('💡 Cache entries will expire based on TTL');
  } catch (error) {
    console.error('❌ Cache clear error:', error);
  }
}

// Health check for Redis
export async function checkRedisHealth(): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('❌ Redis health check failed:', error);
    return false;
  }
}
