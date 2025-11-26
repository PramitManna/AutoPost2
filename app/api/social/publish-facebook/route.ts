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

    const { accessToken, user, activePage } = await tokenResponse.json();
    
    // Use active page if available, otherwise fall back to legacy user fields
    const pageId = activePage?.pageId || user.pageId;
    const pageToken = activePage?.pageToken || accessToken;
    
    if (!pageToken || !pageId) {
      return NextResponse.json(
        { error: "Invalid token or no Facebook page connected" },
        { status: 401 }
      );
    }

    



    // Step 1: Get Page Access Token (the user token might not have page posting permissions)
    const pageTokenRes = await axios.get(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${pageToken}`
    );

    const pageAccessToken = pageTokenRes.data.access_token;

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
    console.error("Facebook publishing error:", err);

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
