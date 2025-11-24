import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/token-manager';
import { SECURITY_HEADERS } from '@/lib/security-config';

/**
 * Get user's decrypted access token by email
 * This endpoint is used internally by API routes that need to make Meta API calls
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    

    
    // Get user and decrypted token by email
    const result = await getUserByEmail(email);
    
    if (!result) {
      return NextResponse.json({ 
        error: 'User not found or token expired',
        hasValidToken: false
      }, { status: 404 });
    }
    
    const { user, accessToken } = result;
    

    
    const response = NextResponse.json({
      success: true,
      hasValidToken: true,
      accessToken: accessToken,
      user: {
        userId: user.userId,
        email: user.email,
        userName: user.userName,
        pageId: user.pageId,
        pageName: user.pageName,
        igBusinessId: user.igBusinessId,
        igUsername: user.igUsername,
        permissions: user.permissions,
        lastActivity: user.lastActivity
      }
    });
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('Error getting user access token:', error);
    return NextResponse.json({ 
      error: 'Failed to get access token',
      hasValidToken: false
    }, { status: 500 });
  }
}

/**
 * Check if user has a valid access token without returning it
 * Useful for authentication checks
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    

    
    // Check if user has valid token
    const result = await getUserByEmail(email);
    
    const hasValidToken = !!result;
    

    
    const response = NextResponse.json({
      hasValidToken,
      user: result ? {
        userId: result.user.userId,
        userName: result.user.userName,
        pageId: result.user.pageId,
        pageName: result.user.pageName,
        igBusinessId: result.user.igBusinessId,
        igUsername: result.user.igUsername,
        lastActivity: result.user.lastActivity
      } : null
    });
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('Error checking token validity:', error);
    return NextResponse.json({ 
      error: 'Failed to check token validity',
      hasValidToken: false
    }, { status: 500 });
  }
}