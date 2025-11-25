import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { SECURITY_HEADERS } from '@/lib/security-config';

/**
 * Sync user authentication data from Supabase to our MongoDB
 * This ensures user profiles are stored in our database for Meta token management
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, userName, provider } = body;
    
    if (!userId || !email) {
      return NextResponse.json({ error: 'User ID and email required' }, { status: 400 });
    }
    

    
    await connectToDatabase();
    
    // Use findOneAndUpdate to avoid duplicate key errors
    let user = await User.findOneAndUpdate(
      { userId },
      {
        email,
        userName: userName || email.split('@')[0],
        lastActivity: new Date(),
        updatedAt: new Date(),
        $setOnInsert: {
          encryptedAccessToken: '', // Will be set when Meta tokens are connected
          tokenExpiry: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // Default 60 days from now
          isActive: false, // Will be set to true when Meta tokens are connected
          permissions: [],
          createdAt: new Date(),
          dataRetentionConsent: new Date()
        }
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );
    
    
    // Return safe profile data
    const profileData = {
      userId: user.userId,
      email: user.email,
      userName: user.userName,
      isActive: user.isActive,
      hasMetaTokens: user.isActive && !!user.pageId,
      connected: user.isActive && !!user.pageId,
      createdAt: user.createdAt,
      lastActivity: user.lastActivity
    };
    
    const response = NextResponse.json({
      success: true,
      message: 'User profile synced successfully',
      profile: profileData
    });
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('Error syncing user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to sync user profile',
      success: false
    }, { status: 500 });
  }
}

/**
 * Get synced user profile from MongoDB
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }
    
    await connectToDatabase();
    
    const user = await User.findOne({ userId });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found in database',
        synced: false
      }, { status: 404 });
    }
    
    // Return safe profile data
    const profileData = {
      userId: user.userId,
      email: user.email,
      userName: user.userName,
      isActive: user.isActive,
      hasMetaTokens: user.isActive && !!user.pageId,
      connected: user.isActive && !!user.pageId,
      pageId: user.pageId || null,
      pageName: user.pageName || null,
      igBusinessId: user.igBusinessId || null,
      igUsername: user.igUsername || null,
      lastActivity: user.lastActivity,
      createdAt: user.createdAt
    };
    
    const response = NextResponse.json({
      synced: true,
      profile: profileData
    });
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('Error getting synced user profile:', error);
    return NextResponse.json({ 
      error: 'Failed to get user profile',
      synced: false
    }, { status: 500 });
  }
}