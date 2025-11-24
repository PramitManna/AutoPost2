import { NextRequest, NextResponse } from 'next/server';
import { getUserToken } from '@/lib/token-manager';
import { SECURITY_HEADERS } from '@/lib/security-config';

/**
 * Get user profile information including Meta connection status
 */

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    

    
    // Get user from our database
    const user = await getUserToken(userId);
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        connected: false,
        hasMetaTokens: false
      }, { status: 404 });
    }
    
    // Return safe user profile data (no sensitive tokens)
    const profile = {
      userId: user.userId,
      userName: user.userName,
      email: user.email,
      pageId: user.pageId,
      pageName: user.pageName,
      igBusinessId: user.igBusinessId,
      igUsername: user.igUsername,
      permissions: user.permissions,
      isActive: user.isActive,
      connected: user.isActive && !!user.pageId,
      hasMetaTokens: user.isActive && !!user.pageId,
      lastActivity: user.lastActivity,
      tokenRefreshedAt: user.tokenRefreshedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
    
    console.log(`📊 Profile data for ${userId}:`, {
      connected: profile.connected,
      pageName: profile.pageName,
      igUsername: profile.igUsername
    });
    
    const response = NextResponse.json(profile);
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('Error getting user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to get profile',
      connected: false,
      hasMetaTokens: false
    }, { status: 500 });
  }
}