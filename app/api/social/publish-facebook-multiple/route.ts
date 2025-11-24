import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, caption, userEmail } = await req.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "imageUrls must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!caption || !userEmail) {
      return NextResponse.json(
        { error: "Missing required fields: caption, userEmail" },
        { status: 400 }
      );
    }

    console.log(`📱 Publishing multiple images to Facebook for user: ${userEmail}`);

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
    
    if (!accessToken || !user.pageId) {
      return NextResponse.json(
        { error: "Invalid token or no Facebook page connected" },
        { status: 401 }
      );
    }

    console.log(`✅ Publishing to page: ${user.pageName} for user: ${userEmail}`);

    const { pageId } = user;


    // Step 1: Get Page Access Token
    const pageTokenRes = await axios.get(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${accessToken}`
    );

    const pageAccessToken = pageTokenRes.data.access_token;

    // Step 2: Upload all images first (unpublished)
    const mediaIds = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];

      const uploadRes = await axios.post(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          url: imageUrl,
          published: false, // Don't publish yet, just upload
        },
        {
          headers: {
            'Authorization': `Bearer ${pageAccessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      mediaIds.push({
        media_fbid: uploadRes.data.id
      });

    }

    // Step 3: Create a multi-photo post with all uploaded images
    const multiPostRes = await axios.post(
      `https://graph.facebook.com/v21.0/${pageId}/feed`,
      {
        message: caption,
        attached_media: mediaIds,
      },
      {
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );


    // Construct the post URL
    const postUrl = `https://www.facebook.com/${multiPostRes.data.id}`;

    return NextResponse.json({
      success: true,
      postId: multiPostRes.data.id,
      postUrl: postUrl,
      message: `Posted ${imageUrls.length} images to Facebook successfully!`,
      mediaCount: imageUrls.length,
    });

  } catch (error) {
    const err = error as { response?: { status: number; data: unknown }; message: string };
    console.error(" Facebook multiple images publishing error:", err);

    if (err.response) {
      console.error("Error response:", err.response.data);
      return NextResponse.json(
        {
          error: "Facebook API error",
          details: err.response.data
        },
        { status: err.response.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to publish multiple images to Facebook", details: err.message },
      { status: 500 }
    );
  }
}
