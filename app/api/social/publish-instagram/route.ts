import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, caption, userEmail } = await req.json();

    if (!imageUrl || !caption || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields: imageUrl, caption, userEmail" },
        { status: 400 }
      );
    }

    // Get user's access token by email
    const tokenResponse = await fetch(`${req.nextUrl.origin}/api/user/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: "No valid Meta token found. Please connect your Meta account first." },
        { status: 401 }
      );
    }

    const { accessToken, user } = await tokenResponse.json();

    if (!accessToken || !user.igBusinessId) {
      return NextResponse.json(
        { error: "No Instagram Business account connected. Please connect one from your Facebook page." },
        { status: 400 }
      );
    }

    const { igBusinessId } = user;
    



    // Step 1: Create media container (upload image)
    const containerRes = await axios.post(
      `https://graph.facebook.com/v21.0/${igBusinessId}/media`,
      {
        image_url: imageUrl,
        caption: caption,
        media_type: "IMAGE"
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const creationId = containerRes.data.id;

    // Step 2: Wait for media to be ready (Instagram needs time to process)
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    // Step 3: Publish the media with retry logic
    let publishRes;
    const retries = 3;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        
        publishRes = await axios.post(
          `https://graph.facebook.com/v21.0/${igBusinessId}/media_publish`,
          {
            creation_id: creationId
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        break; // Success! Exit the retry loop

      } catch (retryError) {
        const err = retryError as { response?: { data?: { error?: { error_subcode?: number; message?: string } } }; message: string };
        lastError = err;
        
        // Check if it's a "media not ready" error
        if (err.response?.data?.error?.error_subcode === 2207027) {
          
          if (attempt < retries) {
            // Wait progressively longer (2s, 4s, 6s)
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        } else {
          // Different error, don't retry
          throw err;
        }
      }
    }

    // If we exhausted retries, throw the last error
    if (!publishRes) {
      console.error(" Failed to publish after all retries");
      throw lastError;
    }

    return NextResponse.json({
      success: true,
      postId: publishRes.data.id,
      message: "Posted to Instagram successfully!",
    });

  } catch (error) {
    const err = error as { response?: { status: number; data: unknown }; message: string };
    console.error(" Instagram publishing error:", err);
    
    if (err.response) {
      console.error("Error response:", err.response.data);
      return NextResponse.json(
        { 
          error: "Instagram API error", 
          details: err.response.data 
        },
        { status: err.response.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to publish to Instagram", details: err.message },
      { status: 500 }
    );
  }
}
