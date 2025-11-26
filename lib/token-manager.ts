import axios from 'axios';
import crypto from 'crypto';
import { connectToDatabase } from './mongodb';
import User, { IUser } from '../models/User';

/**
 * Generate a unique user ID based on request
 * In production, use proper session-based or authenticated user IDs
 */
export function generateUserId(req: any): string {
  // Try to get IP from various headers for fallback
  let ip = 'unknown';
  
  if (req && typeof req === 'object') {
    if (req.headers) {
      const forwarded = req.headers.get?.('x-forwarded-for') || req.headers['x-forwarded-for'];
      const realIp = req.headers.get?.('x-real-ip') || req.headers['x-real-ip'];
      const clientIp = req.headers.get?.('x-client-ip') || req.headers['x-client-ip'];
      
      ip = (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded) || 
           realIp || 
           clientIp || 
           'unknown';
    }
    
    // For NextRequest objects
    if (req.ip) {
      ip = req.ip;
    }
  }
  
  // Generate a more secure hash-based ID
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHash('sha256')
    .update(`${ip}_${timestamp}_${randomBytes}`)
    .digest('hex')
    .substring(0, 16);
  
  return `fallback_${hash}`;
}

/**
 * Validate Meta permissions for production compliance
 */
export function validateMetaPermissions(permissions: string[]): boolean {
  const requiredPermissions = [
    'pages_show_list',
    'pages_read_engagement', 
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish'
  ];
  
  return requiredPermissions.every(permission => permissions.includes(permission));
}

/**
 * Store or update user's Meta tokens in database with encryption
 */
export async function storeUserToken(
  userId: string,
  tokenData: {
    accessToken: string;
    pageId?: string;
    pageName?: string;
    igBusinessId?: string;
    igUsername?: string;
    userName?: string;
    email?: string;
    metaUserId?: string;
    permissions?: string[];
  }
): Promise<IUser> {
  await connectToDatabase();

  // Calculate token expiry (60 days from now)
  const tokenExpiry = new Date();
  tokenExpiry.setDate(tokenExpiry.getDate() + 60);

  // Find existing user or create new one
  let user = await User.findOne({ userId }).select('+encryptedAccessToken');
  
  if (user) {
    // Update existing user
    user.userName = tokenData.userName;
    user.email = tokenData.email;
    user.pageId = tokenData.pageId;
    user.pageName = tokenData.pageName;
    user.igBusinessId = tokenData.igBusinessId;
    user.igUsername = tokenData.igUsername;
    user.metaUserId = tokenData.metaUserId;
    user.permissions = tokenData.permissions || [];
    user.tokenExpiry = tokenExpiry;
    user.tokenRefreshedAt = new Date();
    user.isActive = true;
    user.lastActivity = new Date();
    
    // Encrypt and store the token
    user.setEncryptedToken(tokenData.accessToken);
    
    await user.save();
  } else {
    // Create new user
    user = new User({
      userId,
      userName: tokenData.userName,
      email: tokenData.email,
      pageId: tokenData.pageId,
      pageName: tokenData.pageName,
      igBusinessId: tokenData.igBusinessId,
      igUsername: tokenData.igUsername,
      metaUserId: tokenData.metaUserId,
      permissions: tokenData.permissions || [],
      tokenExpiry,
      tokenRefreshedAt: new Date(),
      isActive: true,
      lastActivity: new Date(),
      dataRetentionConsent: new Date(), // GDPR compliance
    });
    
    // Encrypt and store the token
    user.setEncryptedToken(tokenData.accessToken);
    
    await user.save();
  }

  // Return user without sensitive data
  const userWithoutSensitiveData = await User.findById(user._id);
  if (!userWithoutSensitiveData) {
    throw new Error('Failed to retrieve stored user');
  }
  return userWithoutSensitiveData;
}

/**
 * Store multiple pages for a user (new multi-page support)
 */
export async function storeUserPages(
  userId: string,
  userData: {
    accessToken: string; // User-level token
    pages: Array<{
      pageId: string;
      pageName: string;
      pageToken: string;
      category?: string;
      tasks?: string[];
      igBusinessId?: string;
      igUsername?: string;
    }>;
    userName?: string;
    email?: string;
    metaUserId?: string;
    permissions?: string[];
  }
): Promise<IUser> {
  await connectToDatabase();

  // Calculate token expiry (60 days from now)
  const tokenExpiry = new Date();
  tokenExpiry.setDate(tokenExpiry.getDate() + 60);

  // Find existing user or create new one
  let user = await User.findOne({ userId }).select('+encryptedAccessToken +pages');
  
  if (user) {
    // Update existing user
    user.userName = userData.userName;
    user.email = userData.email;
    user.metaUserId = userData.metaUserId;
    user.permissions = userData.permissions || [];
    user.tokenExpiry = tokenExpiry;
    user.tokenRefreshedAt = new Date();
    user.isActive = true;
    user.lastActivity = new Date();
    
    // Encrypt and store the user-level token
    user.setEncryptedToken(userData.accessToken);
    
    // Store all pages with their tokens
    user.pages = userData.pages.map(page => {
      const iv = crypto.randomBytes(16);
      const key = getEncryptionKey();
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(page.pageToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        pageId: page.pageId,
        pageName: page.pageName,
        encryptedPageToken: iv.toString('hex') + ':' + encrypted,
        category: page.category,
        tasks: page.tasks,
        igBusinessId: page.igBusinessId,
        igUsername: page.igUsername,
      };
    });
    
    // Set active page to first page if not already set
    if (!user.activePageId && userData.pages.length > 0) {
      user.activePageId = userData.pages[0].pageId;
    }
    
    // Also store first page data in legacy fields for backwards compatibility
    if (userData.pages.length > 0) {
      const firstPage = userData.pages[0];
      user.pageId = firstPage.pageId;
      user.pageName = firstPage.pageName;
      user.igBusinessId = firstPage.igBusinessId;
      user.igUsername = firstPage.igUsername;
    }
    
    await user.save();
  } else {
    // Create new user with all pages
    const encryptedPages = userData.pages.map(page => {
      const iv = crypto.randomBytes(16);
      const key = getEncryptionKey();
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      
      let encrypted = cipher.update(page.pageToken, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return {
        pageId: page.pageId,
        pageName: page.pageName,
        encryptedPageToken: iv.toString('hex') + ':' + encrypted,
        category: page.category,
        tasks: page.tasks,
        igBusinessId: page.igBusinessId,
        igUsername: page.igUsername,
      };
    });
    
    user = new User({
      userId,
      userName: userData.userName,
      email: userData.email,
      metaUserId: userData.metaUserId,
      permissions: userData.permissions || [],
      tokenExpiry,
      tokenRefreshedAt: new Date(),
      isActive: true,
      lastActivity: new Date(),
      dataRetentionConsent: new Date(),
      pages: encryptedPages,
      activePageId: userData.pages.length > 0 ? userData.pages[0].pageId : undefined,
      // Legacy fields for backwards compatibility
      pageId: userData.pages.length > 0 ? userData.pages[0].pageId : undefined,
      pageName: userData.pages.length > 0 ? userData.pages[0].pageName : undefined,
      igBusinessId: userData.pages.length > 0 ? userData.pages[0].igBusinessId : undefined,
      igUsername: userData.pages.length > 0 ? userData.pages[0].igUsername : undefined,
    });
    
    // Encrypt and store the user-level token
    user.setEncryptedToken(userData.accessToken);
    
    await user.save();
  }

  // Return user without sensitive data
  const userWithoutSensitiveData = await User.findById(user._id);
  if (!userWithoutSensitiveData) {
    throw new Error('Failed to retrieve stored user');
  }
  return userWithoutSensitiveData;
}

// Helper to get encryption key
function getEncryptionKey(): Buffer {
  const keyString = process.env.TOKEN_ENCRYPTION_KEY || 'default-fallback-key-32-chars-long';
  if (keyString.length !== 64) {
    console.warn('TOKEN_ENCRYPTION_KEY should be 64 hex characters (32 bytes)');
  }
  let keyBuffer: Buffer;
  if (/^[0-9a-fA-F]{64}$/.test(keyString)) {
    keyBuffer = Buffer.from(keyString, 'hex');
  } else {
    keyBuffer = crypto.createHash('sha256').update(keyString).digest();
  }
  return keyBuffer;
}

/**
 * Get user's valid token from database
 * Returns null if token is expired or user not found
 */
export async function getUserToken(userId: string): Promise<IUser | null> {
  await connectToDatabase();

  const user = await User.findOne({ 
    userId, 
    isActive: true 
  }).select('+encryptedAccessToken');

  if (!user) {
    return null;
  }

  // Check if token is expired
  if (user.isTokenExpired()) {
    // Mark user as inactive but don't delete (for audit trail)
    user.isActive = false;
    await user.save();
    return null;
  }

  // Update last activity
  user.lastActivity = new Date();
  await user.save();

  return user;
}

/**
 * Get user by email address and return their decrypted access token
 * This is the main function to use for API calls
 */
export async function getUserByEmail(email: string): Promise<{
  user: IUser;
  accessToken: string;
  activePage?: {
    pageId: string;
    pageName: string;
    pageToken: string;
    category?: string;
    tasks?: string[];
    igBusinessId?: string;
    igUsername?: string;
  };
} | null> {
  await connectToDatabase();

  const user = await User.findOne({ 
    email, 
    isActive: true 
  }).select('+encryptedAccessToken +pages');

  if (!user) {

    return null;
  }

  // Check if token is expired
  if (user.isTokenExpired()) {

    // Mark user as inactive but don't delete (for audit trail)
    user.isActive = false;
    await user.save();
    return null;
  }

  // Get decrypted access token
  let accessToken: string;
  try {
    accessToken = user.getDecryptedToken();

  } catch (error) {
    console.error(`Failed to decrypt token for ${email}:`, error);
    return null;
  }

  // Get active page information if available
  let activePage;
  if (user.activePageId && user.pages && user.pages.length > 0) {
    const page = user.pages.find(p => p.pageId === user.activePageId);
    if (page) {
      try {
        const pageToken = user.getDecryptedPageToken(user.activePageId);
        activePage = {
          pageId: page.pageId,
          pageName: page.pageName,
          pageToken,
          category: page.category,
          tasks: page.tasks,
          igBusinessId: page.igBusinessId,
          igUsername: page.igUsername
        };
      } catch (error) {
        console.error(`Failed to decrypt page token for ${email}:`, error);
      }
    }
  }

  // Update last activity
  user.lastActivity = new Date();
  await user.save();

  return { user, accessToken, activePage };
}

/**
 * Refresh an expired long-lived token
 * Note: Meta allows refreshing tokens before they expire
 */
export async function refreshUserToken(userId: string): Promise<IUser | null> {
  await connectToDatabase();

  const user = await User.findOne({ 
    userId, 
    isActive: true 
  }).select('+encryptedAccessToken');
  
  if (!user) {
    return null;
  }

  try {
    // Get current token
    const currentToken = user.getDecryptedToken();
    
    // Exchange old token for new long-lived token
    const response = await axios.get(
      'https://graph.facebook.com/v21.0/oauth/access_token',
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          fb_exchange_token: currentToken,
        },
      }
    );

    const newToken = response.data.access_token;
    const tokenExpiry = new Date();
    tokenExpiry.setDate(tokenExpiry.getDate() + 60);

    // Update the token in database
    user.setEncryptedToken(newToken);
    user.tokenExpiry = tokenExpiry;
    user.tokenRefreshedAt = new Date();
    user.lastActivity = new Date();
    
    await user.save();

    // Return user without sensitive data
    return await User.findById(user._id);
  } catch (error) {
    console.error(`Token refresh failed for user: ${userId}`, error);
    // Mark user as inactive if token refresh fails
    user.isActive = false;
    await user.save();
    return null;
  }
}

/**
 * Get valid token with automatic refresh if needed
 * This is the main function to use in API routes
 */
export async function getValidToken(userId: string): Promise<IUser | null> {
  let user = await getUserToken(userId);

  if (!user) {
    return null;
  }

  // Check if token expires soon and refresh proactively
  if (user.needsTokenRefresh()) {

    const refreshedUser = await refreshUserToken(userId);
    if (refreshedUser) {
      user = refreshedUser;
    } else {
      // If refresh failed, return null to force re-authentication
      return null;
    }
  }

  return user;
}

/**
 * Get decrypted access token for API calls
 * This should only be used within secure contexts
 */
export async function getDecryptedAccessToken(userId: string): Promise<string | null> {
  const user = await getValidToken(userId);
  if (!user) {
    return null;
  }

  try {
    const userWithToken = await User.findById(user._id).select('+encryptedAccessToken');
    if (!userWithToken) {
      return null;
    }
    
    return userWithToken.getDecryptedToken();
  } catch (error) {
    console.error(`Failed to decrypt token for user: ${userId}`, error);
    return null;
  }
}

/**
 * Delete user token from database (logout)
 * For GDPR compliance, we mark as inactive instead of hard delete
 */
export async function deleteUserToken(userId: string, hardDelete = false): Promise<boolean> {
  await connectToDatabase();

  if (hardDelete) {
    // Complete deletion (for GDPR right to be forgotten)
    const result = await User.deleteOne({ userId });
    return result.deletedCount > 0;
  } else {
    // Soft delete - mark as inactive and clear sensitive data
    const user = await User.findOne({ userId }).select('+encryptedAccessToken');
    if (user) {
      user.isActive = false;
      user.encryptedAccessToken = '';
      user.lastActivity = new Date();
      await user.save();
      return true;
    }
    return false;
  }
}

/**
 * Cleanup expired tokens and inactive users
 * Run this as a scheduled job
 */
export async function performCleanup(): Promise<{
  expiredTokens: number;
  inactiveUsers: number;
}> {
  await connectToDatabase();

  // Clean up expired tokens
  const expiredResult = await User.cleanupExpiredTokens();
  
  // Clean up inactive users (90 days)
  const inactiveResult = await User.cleanupInactiveUsers(90);



  return {
    expiredTokens: expiredResult.modifiedCount || 0,
    inactiveUsers: inactiveResult.deletedCount || 0,
  };
}
