/**
 * Security Configuration for Meta App Review and Production
 * 
 * This file contains security best practices and configurations
 * required for Meta's app review process and production deployment.
 */

import crypto from 'crypto';

// Security constants
export const SECURITY_CONFIG = {
  // Token encryption settings
  ENCRYPTION: {
    ALGORITHM: 'aes-256-gcm',
    KEY_LENGTH: 32,
    IV_LENGTH: 16,
    TAG_LENGTH: 16,
  },
  
  // Token management
  TOKENS: {
    LONG_LIVED_EXPIRY_DAYS: 60,
    REFRESH_THRESHOLD_DAYS: 7,
    MAX_REFRESH_ATTEMPTS: 3,
  },
  
  // Rate limiting
  RATE_LIMITS: {
    TOKEN_REFRESH: {
      MAX_ATTEMPTS: 5,
      WINDOW_MINUTES: 15,
    },
    API_CALLS: {
      MAX_PER_MINUTE: 200, // Meta Graph API rate limits
      MAX_PER_HOUR: 4800,
    },
  },
  
  // Data retention (GDPR compliance)
  DATA_RETENTION: {
    INACTIVE_USER_DAYS: 90,
    EXPIRED_TOKEN_CLEANUP_DAYS: 30,
    AUDIT_LOG_RETENTION_DAYS: 365,
  },
  
  // Meta API requirements
  META: {
    API_VERSION: 'v21.0',
    REQUIRED_PERMISSIONS: [
      'pages_show_list',
      'pages_read_engagement', 
      'pages_manage_posts',
      'instagram_basic',
      'instagram_content_publish'
    ],
    // Optional permissions for enhanced features
    OPTIONAL_PERMISSIONS: [
      'pages_read_user_content',
      'instagram_manage_comments',
      'publish_video'
    ],
  },
};

/**
 * Enhanced token encryption using AES-256-GCM
 * More secure than CBC mode used in the basic implementation
 */
export class SecureTokenEncryption {
  private static getEncryptionKey(): Buffer {
    const keyString = process.env.TOKEN_ENCRYPTION_KEY;
    if (!keyString) {
      throw new Error('TOKEN_ENCRYPTION_KEY environment variable is required');
    }
    
    // Convert hex string to buffer or hash to get consistent 32 bytes
    let keyBuffer: Buffer;
    if (/^[0-9a-fA-F]{64}$/.test(keyString)) {
      // Valid 64-character hex string
      keyBuffer = Buffer.from(keyString, 'hex');
    } else {
      // Fallback: hash the string to get consistent 32 bytes
      keyBuffer = crypto.createHash('sha256').update(keyString).digest();
    }
    
    if (keyBuffer.length !== SECURITY_CONFIG.ENCRYPTION.KEY_LENGTH) {
      throw new Error(`Encryption key must be exactly ${SECURITY_CONFIG.ENCRYPTION.KEY_LENGTH} bytes`);
    }
    
    return keyBuffer;
  }

  static encrypt(plaintext: string): string {
    try {
      const key = this.getEncryptionKey();
      const iv = crypto.randomBytes(SECURITY_CONFIG.ENCRYPTION.IV_LENGTH);
      
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Format: iv:encrypted
      return `${iv.toString('hex')}:${encrypted}`;
    } catch (error) {
      console.error('Token encryption failed:', error);
      throw new Error('Failed to encrypt token');
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      const key = this.getEncryptionKey();
      const [ivHex, encryptedHex] = encryptedData.split(':');
      
      if (!ivHex || !encryptedHex) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(ivHex, 'hex');
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      
      let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Token decryption failed:', error);
      throw new Error('Failed to decrypt token');
    }
  }
}

/**
 * Validate webhook signatures for security
 * Required for Meta webhook endpoints
 */
export function validateWebhookSignature(
  payload: string, 
  signature: string, 
  secret: string
): boolean {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex')
    );
  } catch (error) {
    console.error('Webhook signature validation failed:', error);
    return false;
  }
}

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
}

/**
 * Generate secure random string for session IDs
 */
export function generateSecureId(length = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Rate limiting store interface
 */
export interface RateLimitStore {
  get(key: string): Promise<number>;
  set(key: string, value: number, ttlSeconds: number): Promise<void>;
  increment(key: string, ttlSeconds: number): Promise<number>;
}

/**
 * Simple in-memory rate limiting (use Redis in production)
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { value: number; expires: number }>();
  
  async get(key: string): Promise<number> {
    const item = this.store.get(key);
    if (!item || Date.now() > item.expires) {
      this.store.delete(key);
      return 0;
    }
    return item.value;
  }
  
  async set(key: string, value: number, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expires: Date.now() + (ttlSeconds * 1000)
    });
  }
  
  async increment(key: string, ttlSeconds: number): Promise<number> {
    const current = await this.get(key);
    const newValue = current + 1;
    await this.set(key, newValue, ttlSeconds);
    return newValue;
  }
}

/**
 * Rate limiter implementation
 */
export class RateLimiter {
  constructor(
    private store: RateLimitStore,
    private maxAttempts: number,
    private windowSeconds: number
  ) {}
  
  async checkLimit(identifier: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate_limit:${identifier}`;
    const current = await this.store.increment(key, this.windowSeconds);
    
    return {
      allowed: current <= this.maxAttempts,
      remaining: Math.max(0, this.maxAttempts - current)
    };
  }
}

/**
 * Security headers for production
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://graph.facebook.com https://www.facebook.com;",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), location=()',
};

/**
 * Environment validation for production
 */
export function validateProductionEnvironment(): boolean {
  const requiredEnvVars = [
    'TOKEN_ENCRYPTION_KEY',
    'META_APP_ID',
    'META_APP_SECRET',
    'META_REDIRECT_URI',
    'MONGODB_URI',
    'NEXTAUTH_SECRET'
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    return false;
  }
  
  // Validate encryption key strength
  const encryptionKey = process.env.TOKEN_ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length < 32) {
    console.error('TOKEN_ENCRYPTION_KEY must be at least 32 characters');
    return false;
  }
  
  console.log('Production environment validation passed');
  return true;
}