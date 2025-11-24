import { NextRequest, NextResponse } from 'next/server';
import { deleteUserToken } from '@/lib/token-manager';
import { SECURITY_HEADERS } from '@/lib/security-config';

/**
 * Clean up user tokens on logout
 * Called by the client-side auth context
 */

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    

    
    // Clean up user tokens (soft delete by default)
    const success = await deleteUserToken(userId, false);
    
    const response = NextResponse.json({ 
      success,
      message: success ? 'Tokens cleaned up successfully' : 'User not found or already cleaned up'
    });
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('❌ Error cleaning up user tokens:', error);
    return NextResponse.json({ 
      error: 'Failed to cleanup tokens',
      success: false
    }, { status: 500 });
  }
}