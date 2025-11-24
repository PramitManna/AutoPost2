import { NextRequest, NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';
import { getOptimizationStats } from '@/lib/cost-optimizer';
import { connectToDatabase } from '@/lib/mongodb';
import { SECURITY_HEADERS } from '@/lib/security-config';

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const redis = getRedisClient();
    const optimizationStats = getOptimizationStats();
    
    // Check database connection
    await connectToDatabase();
    const dbConnectionTime = Date.now() - startTime;
    
    // Check user authentication integration
    const User = (await import('@/models/User')).default;
    const userStats = {
      totalUsers: await User.countDocuments(),
      activeUsers: await User.countDocuments({ isActive: true }),
      usersWithMetaTokens: await User.countDocuments({ 
        isActive: true, 
        pageId: { $exists: true, $ne: null } 
      })
    };
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0-production-ready',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      checks: {
        database: {
          status: 'connected',
          responseTime: `${dbConnectionTime}ms`,
          userAuthentication: {
            totalUsers: userStats.totalUsers,
            activeUsers: userStats.activeUsers,
            connectedToMeta: userStats.usersWithMetaTokens,
            integrationStatus: 'database-backed'
          }
        },
        api: {
          status: 'operational',
          version: 'v21.0'
        },
        security: {
          https: req.url.startsWith('https://'),
          headers: 'configured',
          encryption: 'enabled'
        }
      },
      services: {
        redis: {
          available: !!redis,
          type: process.env.RAILWAY_REDIS_URL ? 'Railway (Production)' : 
                process.env.UPSTASH_REDIS_REST_URL ? 'Upstash (Development)' : 'None',
          status: redis ? 'connected' : 'fallback'
        },
        gemini: {
          available: !!process.env.GEMINI_API_KEY,
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          status: process.env.GEMINI_API_KEY ? 'configured' : 'missing'
        },
        cloudinary: {
          available: !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY),
          autoCleanup: process.env.AUTO_DELETE_IMAGES === 'true',
          status: (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) ? 'configured' : 'missing'
        },
        meta: {
          available: !!(process.env.META_APP_ID && process.env.META_APP_SECRET),
          status: (process.env.META_APP_ID && process.env.META_APP_SECRET) ? 'configured' : 'missing'
        }
      },
      costOptimization: {
        enabled: process.env.COST_OPTIMIZATION_ENABLED === 'true',
        cacheHitRate: `${optimizationStats.hitRate}%`,
        totalRequests: optimizationStats.totalRequests,
        estimatedSavings: `$${optimizationStats.estimatedCostSaved.toFixed(2)}`,
        performance: optimizationStats.isOptimal ? 'optimal' : 'needs_improvement',
        recommendation: optimizationStats.recommendation
      },
      deployment: {
        environment: process.env.NODE_ENV || 'development',
        readyForProduction: (
          !!redis && 
          !!process.env.GEMINI_API_KEY && 
          !!process.env.CLOUDINARY_CLOUD_NAME &&
          process.env.COST_OPTIMIZATION_ENABLED === 'true'
        ),
        estimatedCapacity: redis ? (
          process.env.RAILWAY_REDIS_URL ? '5000+ users' : '100 users (Upstash free tier)'
        ) : '50 users (memory only)',
        monthlyCost: process.env.RAILWAY_REDIS_URL ? '$5-12' : '$0 (limited scale)'
      }
    };

    // Test Redis connection
    if (redis) {
      try {
        if ('ping' in redis && typeof redis.ping === 'function') {
          await redis.ping();
          health.services.redis.status = 'connected';
        }
      } catch (error) {
        health.services.redis.status = 'error';
        console.warn('Redis ping failed:', (error as Error).message);
      }
    }

    // Add Meta configuration status
    (health as any).meta = {
      appId: process.env.NEXT_PUBLIC_META_APP_ID ? 'configured' : 'missing',
      webhooks: process.env.META_WEBHOOK_VERIFY_TOKEN ? 'configured' : 'missing',
      encryption: process.env.TOKEN_ENCRYPTION_KEY ? 'configured' : 'missing'
    };

    const statusCode = health.deployment.readyForProduction ? 200 : 206; // 206 = Partial Content

    const response = NextResponse.json(health, { 
      status: statusCode,
    });
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    response.headers.set('Cache-Control', 'no-cache');
    response.headers.set('X-Health-Check', 'autopost-v2-secure');
    
    return response;

  } catch (error) {
    const errorData = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: (error as Error).message,
      services: {
        redis: { status: 'unknown' },
        gemini: { status: 'unknown' },
        cloudinary: { status: 'unknown' },
        meta: { status: 'unknown' },
        database: { status: 'error' }
      }
    };
    
    const response = NextResponse.json(errorData, { status: 500 });
    
    // Add security headers even for errors
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  }
}

export async function HEAD() {
  // Simple health check for monitoring systems
  try {
    await connectToDatabase();
    
    const response = new NextResponse(null, { status: 200 });
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
