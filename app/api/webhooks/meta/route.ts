import { NextRequest, NextResponse } from 'next/server';
import { validateWebhookSignature } from '@/lib/security-config';

/**
 * Meta Webhook Verification Endpoint
 * Required for Meta App Review - handles webhook verification and events
 */

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  
  // Webhook verification (initial setup)
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  
  console.log('📞 Webhook verification request:', { mode, token, challenge });
  
  if (mode === 'subscribe' && token) {
    // Verify the token matches what we set in Meta App settings
    if (token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
      console.log('✅ Webhook verification successful');
      return new NextResponse(challenge);
    } else {
      console.error('Webhook verification failed - invalid token');
      return NextResponse.json({ error: 'Invalid verification token' }, { status: 403 });
    }
  }
  
  console.error('Webhook verification failed - invalid parameters');
  return NextResponse.json({ error: 'Invalid webhook verification' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256');
    
    console.log('📨 Webhook event received');
    
    // Validate webhook signature for security
    if (!signature || !process.env.META_APP_SECRET) {
      console.error('Missing signature or app secret');
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }
    
    const isValidSignature = validateWebhookSignature(
      body,
      signature,
      process.env.META_APP_SECRET
    );
    
    if (!isValidSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }
    
    // Parse webhook data
    const webhookData = JSON.parse(body);
    console.log('📋 Webhook data:', JSON.stringify(webhookData, null, 2));
    
    // Process webhook events
    if (webhookData.object === 'page') {
      for (const entry of webhookData.entry || []) {
        // Handle page events (posts, comments, etc.)
        console.log('📄 Page event:', entry);
        
        // Example: Handle token deauthorization
        if (entry.changes) {
          for (const change of entry.changes) {
            if (change.field === 'feed' && change.value.verb === 'remove') {
              // User revoked permissions - clean up their data
              console.log('🗑️ User revoked permissions, cleaning up data...');
              // Implement cleanup logic here
            }
          }
        }
      }
    }
    
    // Always return 200 OK to acknowledge receipt
    return NextResponse.json({ status: 'ok' });
    
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}