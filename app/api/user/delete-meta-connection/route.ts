import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { SECURITY_HEADERS } from '@/lib/security-config';

/**
 * Delete user's Meta account connections while preserving the user profile
 * This allows users to disconnect from Meta platforms without deleting their entire account
 */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    

    
    await connectToDatabase();
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return NextResponse.json({ 
        error: 'User not found'
      }, { status: 404 });
    }
    
    // Store current connection info for logging
    const connectionInfo = {
      hadFacebookPage: !!user.pageId,
      hadInstagramBusiness: !!user.igBusinessId,
      pageName: user.pageName,
      igUsername: user.igUsername,
      wasActive: user.isActive
    };
    
    // Clear Meta-related data while preserving user profile
    user.encryptedAccessToken = '';
    user.tokenExpiry = new Date(); // Mark as expired
    user.tokenRefreshedAt = undefined;
    user.pageId = undefined;
    user.pageName = undefined;
    user.igBusinessId = undefined;
    user.igUsername = undefined;
    user.permissions = [];
    user.isActive = false; // Mark as inactive since no Meta connection
    user.updatedAt = new Date();
    user.lastActivity = new Date();
    
    await user.save();
    

    
    // Create audit log entry
    await createAuditLogEntry(user.userId, 'meta_disconnect', {
      email,
      ...connectionInfo,
      disconnectionDate: new Date().toISOString()
    });
    
    const response = NextResponse.json({
      success: true,
      message: 'Meta account connections removed successfully',
      removedConnections: {
        facebook: connectionInfo.hadFacebookPage,
        instagram: connectionInfo.hadInstagramBusiness
      },
      timestamp: new Date().toISOString()
    });
    
    // Add security headers
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
    
  } catch (error) {
    console.error('Error disconnecting Meta accounts:', error);
    return NextResponse.json({ 
      error: 'Failed to disconnect Meta accounts'
    }, { status: 500 });
  }
}

/**
 * Create audit log entry for compliance tracking
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createAuditLogEntry(userId: string, action: string, details: any) {
  try {
    // In production, this would write to a dedicated audit log collection
    console.log(`📝 Audit Log Entry:`, {
      userId,
      action,
      timestamp: new Date().toISOString(),
      details: JSON.stringify(details)
    });
    
    // For now, we'll just log it. In production, you'd save to database:
    // await AuditLog.create({
    //   userId,
    //   action,
    //   details,
    //   timestamp: new Date(),
    //   category: 'data_management'
    // });
    
  } catch (error) {
    console.warn('Could not create audit log entry:', error);
  }
}