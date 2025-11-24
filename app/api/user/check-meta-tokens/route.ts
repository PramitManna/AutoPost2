import { NextRequest, NextResponse } from 'next/server';
import { getUserToken } from '@/lib/token-manager';

/**
 * Check if user has valid Meta tokens
 * Used by the authentication context to determine connection status
 */

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    

    
    // Check if user has valid tokens in our database
    const user = await getUserToken(userId);
    
    const hasTokens = !!(user && user.pageId && user.isActive);
    

    
    return NextResponse.json({ 
      hasTokens,
      connected: hasTokens,
      pageId: user?.pageId || null,
      pageName: user?.pageName || null,
      igBusinessId: user?.igBusinessId || null,
      lastActivity: user?.lastActivity || null
    });
    
  } catch (error) {
    console.error('❌ Error checking Meta tokens:', error);
    return NextResponse.json({ 
      error: 'Failed to check tokens',
      hasTokens: false 
    }, { status: 500 });
  }
}