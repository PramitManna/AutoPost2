import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { generateUserId, storeUserToken } from "@/lib/token-manager";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  if (!code) {
    return NextResponse.json({ error: "No code received" }, { status: 400 });
  }

  try {
    const shortTokenRes = await axios.get(
      "https://graph.facebook.com/v21.0/oauth/access_token",
      {
        params: {
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          redirect_uri: process.env.META_REDIRECT_URI,
          code,
        },
      }
    );

    const shortToken = shortTokenRes.data.access_token;

    const longTokenRes = await axios.get(
      "https://graph.facebook.com/v21.0/oauth/access_token",
      {
        params: {
          grant_type: "fb_exchange_token",
          client_id: process.env.META_APP_ID,
          client_secret: process.env.META_APP_SECRET,
          fb_exchange_token: shortToken,
        },
      }
    );

    const longToken = longTokenRes.data.access_token;

    const userRes = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${longToken}`
    );

    const pagesRes = await axios.get(
      `https://graph.facebook.com/me/accounts?fields=id,name,access_token,category,tasks&access_token=${longToken}`
    );

    if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
      const url = new URL("/dashboard", req.url);
      url.searchParams.set("error", "no_page");
      url.searchParams.set(
        "message",
        "No Facebook pages found. Make sure you're an admin of a Facebook page and granted page permissions."
      );
      return NextResponse.redirect(url);
    }

    const pageData = pagesRes.data.data[0];
    const pageId = pageData.id;

    let igBusinessId = null;

    try {
      const igRes = await axios.get(
        `https://graph.facebook.com/${pageId}?fields=instagram_business_account&access_token=${longToken}`
      );

      igBusinessId = igRes.data.instagram_business_account?.id;
    } catch (igError) {
      console.warn("Instagram Business Account lookup failed:", igError);
    }

    const sessionUserId = req.cookies.get('userId')?.value;
    const stateUserId = state;
    const userId = stateUserId || sessionUserId || generateUserId(req);
    
    if (!stateUserId && !sessionUserId) {
      console.warn("No authenticated user ID found, using IP-based fallback");
    }

    let igUsername = null;
    if (igBusinessId) {
      try {
        const igUserRes = await axios.get(
          `https://graph.facebook.com/${igBusinessId}?fields=username&access_token=${longToken}`
        );
        igUsername = igUserRes.data.username;
      } catch (error) {
        console.warn("Could not fetch Instagram username:", error);
      }
    }

    // Store user with encrypted token and enhanced security data
    await storeUserToken(userId, {
      accessToken: longToken,
      pageId: pageId,
      pageName: pageData.name,
      igBusinessId: igBusinessId || undefined,
      igUsername: igUsername || undefined,
      userName: userRes.data.name,
      email: userRes.data.email,
      metaUserId: userRes.data.id, // Store Meta's user ID for verification
      permissions: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish'
      ], // Store granted permissions for audit
    });

    const response = NextResponse.redirect(new URL("/dashboard?connected=true", req.url));
    response.cookies.delete('userId');
    
    return response;

  } catch (err) {
    const error = err as {
      response?: { status: number; data: unknown; headers: unknown };
      message: string;
    };

    console.error("Meta Callback Error:", error.message);

    if (error.response) {
      console.error("Response Status:", error.response.status);
      console.error("Response Data:", error.response.data);
    }

    return NextResponse.json(
      {
        error: "Token exchange failed",
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
