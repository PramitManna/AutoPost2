import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { SECURITY_HEADERS } from '@/lib/security-config';

/**
 * Get comprehensive user privacy data for the Privacy & Data page
 */

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    

    
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found',
        profile: null
      }, { status: 404 });
    }
    
    // Prepare comprehensive privacy data
    const privacyData = {
      profile: {
        userId: user.userId,
        email: user.email,
        userName: user.userName || (user.email ? user.email.split('@')[0] : 'Unknown'),
        createdAt: user.createdAt || new Date(),
        lastActivity: user.lastActivity || new Date()
      },
      metaConnections: {
        pageId: user.pageId || null,
        pageName: user.pageName || null,
        igBusinessId: user.igBusinessId || null,
        igUsername: user.igUsername || null,
        connected: user.isActive && !!user.pageId,
        lastTokenRefresh: user.tokenRefreshedAt || null,
        tokenExpiry: user.tokenExpiry || null
      },
      contentData: {
        totalPosts: await calculateUserPosts(user.userId),
        totalImages: await calculateUserImages(user.userId),
        storageUsed: await calculateStorageUsed(user.userId)
      },
      activityLog: await getRecentActivity(user.userId),
      dataRetention: {
        retentionPeriod: '2 years',
        lastCleanup: user.lastActivity,
        scheduledDeletion: user.isActive ? null : calculateDeletionDate(user.lastActivity || null)
      }
    };
    

    
    const response = NextResponse.json(privacyData);
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('Error fetching privacy data:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch privacy data',
      profile: null
    }, { status: 500 });
  }
}

/**
 * Helper function to calculate user's total posts
 */
async function calculateUserPosts(userId: string): Promise<number> {
  try {
    // This would typically query a Posts collection
    // For now, return a mock count based on user activity
    const user = await User.findOne({ userId });
    return user?.lastActivity ? Math.floor(Math.random() * 50) + 1 : 0;
  } catch (error) {
    console.warn('Could not calculate post count:', error);
    return 0;
  }
}

/**
 * Helper function to calculate user's total images
 */
async function calculateUserImages(userId: string): Promise<number> {
  try {
    // This would typically query an Images/Media collection
    // For now, return a mock count
    const user = await User.findOne({ userId });
    return user?.lastActivity ? Math.floor(Math.random() * 100) + 5 : 0;
  } catch (error) {
    console.warn('Could not calculate image count:', error);
    return 0;
  }
}

/**
 * Helper function to calculate storage used
 */
async function calculateStorageUsed(userId: string): Promise<string> {
  try {
    // This would typically calculate actual storage usage
    // For now, return a mock value
    const user = await User.findOne({ userId });
    if (!user?.lastActivity) return '0 MB';
    
    const mockUsage = Math.floor(Math.random() * 500) + 10; // 10-510 MB
    return mockUsage < 1024 ? `${mockUsage} MB` : `${(mockUsage / 1024).toFixed(1)} GB`;
  } catch (error) {
    console.warn('Could not calculate storage usage:', error);
    return '0 MB';
  }
}

/**
 * Helper function to get recent activity log
 */
async function getRecentActivity(userId: string): Promise<Array<{
  action: string;
  timestamp: string;
  details: string;
}>> {
  try {
    const user = await User.findOne({ userId });
    
    if (!user) return [];
    
    // Mock activity log - in production, this would come from an audit log collection
    const activities = [];
    
    if (user.lastActivity) {
      activities.push({
        action: 'Account Access',
        timestamp: user.lastActivity.toISOString(),
        details: 'User logged into dashboard'
      });
    }
    
    if (user.tokenRefreshedAt) {
      activities.push({
        action: 'Token Refresh',
        timestamp: user.tokenRefreshedAt.toISOString(),
        details: 'Meta access token refreshed'
      });
    }
    
    if (user.createdAt) {
      activities.push({
        action: 'Account Created',
        timestamp: user.createdAt.toISOString(),
        details: 'User account created'
      });
    }
    
    return activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (error) {
    console.warn('Could not fetch activity log:', error);
    return [];
  }
}

/**
 * Helper function to calculate deletion date for inactive users
 */
function calculateDeletionDate(lastActivity: Date | null): string | null {
  if (!lastActivity) return null;
  
  const deletionDate = new Date(lastActivity);
  deletionDate.setDate(deletionDate.getDate() + 730); // 2 years retention
  
  return deletionDate.toISOString();
}