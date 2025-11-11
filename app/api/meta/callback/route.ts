import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "No code received" }, { status: 400 });
  }

  try {
    // Debug environment variables
    console.log("🔍 Debug Info:");
    console.log("META_APP_ID:", process.env.META_APP_ID ? "✅ Set" : "❌ Missing");
    console.log("META_APP_SECRET:", process.env.META_APP_SECRET ? "✅ Set" : "❌ Missing");
    console.log("META_REDIRECT_URI:", process.env.META_REDIRECT_URI);
    console.log("Code length:", code?.length);

    // 1️⃣ Exchange code → short-lived token
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

    // 2️⃣ Exchange short → long-lived token (valid 60 days)
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
    console.log("✅ Long-lived token obtained"+": "+longToken);

    // Get user info for verification
    const userRes = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${longToken}`
    );
    
    console.log("👤 User Info:", userRes.data);

    // Debug: Check what permissions we actually have
    const permissionsRes = await axios.get(
      `https://graph.facebook.com/me/permissions?access_token=${longToken}`
    );
    console.log("🔐 Granted Permissions:", permissionsRes.data);

    // 3️⃣ Get the connected Facebook Page with more debugging
    console.log("🔍 Attempting to fetch pages...");
    const pagesRes = await axios.get(
      `https://graph.facebook.com/me/accounts?fields=id,name,access_token,category,tasks&access_token=${longToken}`
    );

    console.log("📄 Full Pages Response:", JSON.stringify(pagesRes.data, null, 2));
    
    // Check if user has any pages at all
    if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
      console.error("❌ No Facebook pages found in API response");
      console.log("🔍 Troubleshooting steps:");
      console.log("1. Check if you're an admin of the Facebook page");
      console.log("2. Verify the page exists and is published");
      console.log("3. Make sure you granted 'pages_show_list' permission during OAuth");
      console.log("4. Try reconnecting with fresh permissions");
      
      // Let's also check what the user can see
      const debugRes = await axios.get(
        `https://graph.facebook.com/me?fields=id,name&access_token=${longToken}`
      );
      console.log("🔍 User can access basic profile:", debugRes.data);
      
      // Redirect to dashboard with instructions to create a page
      const url = new URL("/dashboard", req.url);
      url.searchParams.set("error", "no_page");
      url.searchParams.set("message", "No Facebook pages found. Make sure you're an admin of a Facebook page and granted page permissions.");
      return NextResponse.redirect(url);
    }

    const pageData = pagesRes.data.data[0];
    const pageId = pageData.id;

    console.log("✅ Page found:", {
      id: pageData.id,
      name: pageData.name,
      category: pageData.category,
      tasks: pageData.tasks
    });

    // 4️⃣ Get the connected Instagram Business Account ID (optional)
    let igBusinessId = null;
    try {
      const igRes = await axios.get(
        `https://graph.facebook.com/${pageId}?fields=instagram_business_account&access_token=${longToken}`
      );
      
      console.log("📱 Instagram Response:", igRes.data);
      igBusinessId = igRes.data.instagram_business_account?.id;
      
      if (igBusinessId) {
        console.log("✅ Instagram Business ID found:", igBusinessId);
      } else {
        console.log("⚠️ No Instagram Business account connected to this page");
      }
    } catch (igError) {
      console.log("⚠️ Instagram account lookup failed (this is optional):", igError);
    }

    // 5️⃣ Store in DB (or print to console for now)
    console.log("✅ Long-Lived Token:", longToken);
    console.log("✅ Page ID:", pageId);
    console.log("✅ IG Business ID:", igBusinessId);

    // You'd normally save this to your DB
    // await db.user.update({
    //   where: { id: userId },
    //   data: { accessToken: longToken, pageId, igBusinessId },
    // });

    // 6️⃣ Redirect to dashboard with confirmation
    const url = new URL("/dashboard", req.url);
    url.searchParams.set("connected", "true");
    url.searchParams.set("accessToken", longToken);
    url.searchParams.set("pageId", pageId);
    url.searchParams.set("userName", userRes.data.name);
    if (igBusinessId) {
      url.searchParams.set("igBusinessId", igBusinessId);
    }
    return NextResponse.redirect(url);
  } catch (err) {
    const error = err as { response?: { status: number; data: unknown; headers: unknown }; message: string };
    console.error("Meta Callback Error:", error.message);
    
    // Log more detailed error info
    if (error.response) {
      console.error("❌ Response Status:", error.response.status);
      console.error("❌ Response Data:", error.response.data);
      console.error("❌ Response Headers:", error.response.headers);
    }
    
    return NextResponse.json({ 
      error: "Token exchange failed", 
      details: error.response?.data || error.message 
    }, { status: 500 });
  }
}
