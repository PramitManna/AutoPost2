import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, caption, pageId, accessToken } = await req.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "imageUrls must be a non-empty array" },
        { status: 400 }
      );
    }

    if (!caption || !pageId || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields: caption, pageId, accessToken" },
        { status: 400 }
      );
    }

    console.log("📤 Publishing multiple images to Facebook...");
    console.log("Page ID:", pageId);
    console.log("Caption:", caption);
    console.log("Number of images:", imageUrls.length);

    // Step 1: Get Page Access Token
    const pageTokenRes = await axios.get(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${accessToken}`
    );

    const pageAccessToken = pageTokenRes.data.access_token;
    console.log("✅ Got page access token");

    // Step 2: Upload all images first (unpublished)
    const mediaIds = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`📷 Uploading image ${i + 1}/${imageUrls.length}:`, imageUrl);

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
      
      console.log(`✅ Image ${i + 1} uploaded with ID:`, uploadRes.data.id);
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

    console.log("✅ Multi-photo post created:", multiPostRes.data);

    return NextResponse.json({
      success: true,
      postId: multiPostRes.data.id,
      message: `Posted ${imageUrls.length} images to Facebook successfully!`,
      mediaCount: imageUrls.length,
    });

  } catch (error) {
    const err = error as { response?: { status: number; data: unknown }; message: string };
    console.error("❌ Facebook multiple images publishing error:", err);
    
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
