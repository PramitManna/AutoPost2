import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { generateUserId, getValidToken } from "@/lib/token-manager";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, caption } = await req.json();

    if (!imageUrl || !caption) {
      return NextResponse.json(
        { error: "Missing required fields: imageUrl, caption" },
        { status: 400 }
      );
    }

    // Get userId and fetch stored token from database
    const userId = generateUserId(req);
    const user = await getValidToken(userId);

    if (!user) {
      return NextResponse.json(
        { error: "No valid token found. Please connect your Meta account first." },
        { status: 401 }
      );
    }

    const { accessToken, pageId } = user;

    console.log("📤 Publishing to Facebook...");
    console.log("User ID:", userId);
    console.log("Page ID:", pageId);
    console.log("Caption:", caption);
    console.log("Image URL:", imageUrl);

    // Step 1: Get Page Access Token (the user token might not have page posting permissions)
    const pageTokenRes = await axios.get(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${accessToken}`
    );

    const pageAccessToken = pageTokenRes.data.access_token;
    console.log("✅ Got page access token");

    // Step 2: Upload photo to Facebook using Page Access Token
    const uploadRes = await axios.post(
      `https://graph.facebook.com/v21.0/${pageId}/photos`,
      {
        url: imageUrl,
        message: caption, // Use 'message' instead of 'caption'
        published: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${pageAccessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log("✅ Facebook upload response:", uploadRes.data);

    // Construct the post URL
    const postUrl = `https://www.facebook.com/${uploadRes.data.post_id}`;

    return NextResponse.json({
      success: true,
      postId: uploadRes.data.id,
      postUrl: postUrl,
      message: "Posted to Facebook successfully!",
    });

  } catch (error) {
    const err = error as { response?: { status: number; data: unknown }; message: string };
    console.error("❌ Facebook publishing error:", err);

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
      { error: "Failed to publish to Facebook", details: err.message },
      { status: 500 }
    );
  }
}
