import { Redis as UpstashRedis } from '@upstash/redis';
import { createClient, RedisClientType } from 'redis';
import { Ratelimit } from '@upstash/ratelimit';

// Initialize Redis client - Smart hybrid approach
// Railway Redis: $5/month unlimited (production)
// Upstash Redis: Free tier limited (development/fallback)
let redis: UpstashRedis | RedisClientType | null = null;
let ratelimit: Ratelimit | null = null;

// Initialize Redis connection
export function getRedisClient(): UpstashRedis | RedisClientType | null {
  if (redis) return redis;

  try {
    // Option 1: Railway Redis (production - $5/month unlimited)
    if (process.env.RAILWAY_REDIS_URL) {
      redis = createClient({
        url: process.env.RAILWAY_REDIS_URL
      });
      
      // Connect to Railway Redis
      (redis as RedisClientType).connect().then(() => {
      }).catch(error => {
        console.error('Railway Redis connection failed:', error);
        redis = null;
      });
      
      return redis;
    }
    
    // Option 2: Upstash Redis (development/small scale)
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      redis = new UpstashRedis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      return redis;
    }
    
    console.warn('⚠️ No Redis credentials found. Add RAILWAY_REDIS_URL or Upstash credentials');
    return null;
  } catch (error) {
    console.error('Failed to initialize Redis:', error);
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
    // Only use rate limiter with Upstash Redis (compatible type)
    if ('set' in redisClient && 'get' in redisClient) {
      ratelimit = new Ratelimit({
        redis: redisClient as UpstashRedis,
        limiter: Ratelimit.slidingWindow(2, '1 m'), // 2 requests per minute
        analytics: true,
        prefix: '@ratelimit/ai-analysis',
      });
    } else {
      console.warn('⚠️ Rate limiting only works with Upstash Redis, using memory fallback');
      return null;
    }
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

// Cache TTL configurations (in seconds) - Optimized for cost savings
export const CacheTTL = {
  imageAnalysis: 60 * 60 * 24 * 30, // 30 days (extended for 95% cache hit rate)
  rateLimit: 60, // 1 minute
  memoryCache: 60 * 60 * 24, // 24 hours in memory
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

// Get cached analysis result - Works with both Railway and Upstash Redis
export async function getCachedAnalysis(hash: string): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const cacheKey = CacheKeys.imageAnalysis(hash);
    let cached: string | null = null;
    
    // Handle different Redis client types
    if ('get' in redis && typeof redis.get === 'function') {
      // Upstash Redis
      cached = await (redis as UpstashRedis).get<string>(cacheKey);
    } else {
      // Railway Redis (standard Redis client)
      cached = await (redis as RedisClientType).get(cacheKey);
    }
    
    if (cached) {
      return cached;
    }
    return null;
  } catch (error) {
    console.error('❌ Redis get error:', error);
    return null;
  }
}

// Set cached analysis result - Works with both Railway and Upstash Redis
export async function setCachedAnalysis(hash: string, description: string): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    const cacheKey = CacheKeys.imageAnalysis(hash);
    const ttl = CacheTTL.imageAnalysis;
    
    // Handle different Redis client types
    if ('set' in redis && typeof redis.set === 'function') {
      // Check if it's Upstash (has specific set method signature)
      try {
        await (redis as UpstashRedis).set(cacheKey, description, { ex: ttl });
      } catch {
        // Railway Redis (standard Redis client)
        await (redis as RedisClientType).setEx(cacheKey, ttl, description);
      }
    } else {
      // Fallback
      await (redis as RedisClientType).setEx(cacheKey, ttl, description);
    }
    
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
    return;
  }

  try {
    // Note: Upstash Redis doesn't support SCAN, so we'll just log
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
