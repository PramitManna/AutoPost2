import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { generateUserId, storeUserPages } from "@/lib/token-manager";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  console.log("=== META CALLBACK START ===");
  console.log("Authorization Code:", code ? "Received" : "MISSING");
  console.log("State:", state);

  if (!code) {
    console.error("ERROR: No authorization code received");
    return NextResponse.json({ error: "No code received" }, { status: 400 });
  }

  try {
    console.log("Step 1: Exchanging authorization code for short-lived token...");
    console.log("Client ID:", process.env.META_APP_ID ? "Set" : "MISSING");
    console.log("Client Secret:", process.env.META_APP_SECRET ? "Set" : "MISSING");
    console.log("Redirect URI:", process.env.META_REDIRECT_URI);

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

    console.log("✓ Short-lived token obtained");
    const shortToken = shortTokenRes.data.access_token;

    console.log("Step 2: Exchanging short-lived token for long-lived token...");
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

    console.log("✓ Long-lived token obtained");
    const longToken = longTokenRes.data.access_token;

    console.log("Step 3: Fetching user profile...");
    const userRes = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email&access_token=${longToken}`
    );

    console.log("✓ User profile fetched:", {
      id: userRes.data.id,
      name: userRes.data.name,
      email: userRes.data.email,
    });

    // Also check available permissions
    console.log("Step 3.5: Checking available permissions...");
    try {
      const permRes = await axios.get(
        `https://graph.facebook.com/me/permissions?access_token=${longToken}`
      );
      console.log("Available permissions:", permRes.data.data?.map((p: any) => p.permission).join(', '));
    } catch (permErr) {
      console.log("Could not fetch permissions:", permErr instanceof Error ? permErr.message : permErr);
    }

    console.log("Step 4: Fetching Facebook pages...");
    console.log("Token being used:", longToken.substring(0, 20) + "...");
    
    // Try fetching with limit to get all pages
    const pagesRes = await axios.get(
      `https://graph.facebook.com/me/accounts?fields=id,name,access_token,category,tasks&limit=100&access_token=${longToken}`
    );

    console.log("Pages API Response:", JSON.stringify(pagesRes.data, null, 2));
    console.log("Total pages found:", pagesRes.data.data?.length || 0);
    
    // Also check what pages the app has access to via permissions
    try {
      console.log("Checking app-level page access via business discovery...");
      const businessPages = await axios.get(
        `https://graph.facebook.com/me?fields=accounts.limit(100){id,name,category}&access_token=${longToken}`
      );
      console.log("Business pages accessible:", JSON.stringify(businessPages.data, null, 2));
    } catch (bizErr) {
      console.warn("Could not fetch business pages:", bizErr instanceof Error ? bizErr.message : bizErr);
    }
    
    // Debug: Also try fetching with different fields
    if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
      // Extra debugging: inspect token and try user-scoped accounts call with perms
      try {
        console.log("Running debug_token to inspect the access token details...");
        const appAccessToken = `${process.env.META_APP_ID}|${process.env.META_APP_SECRET}`;
        const debugRes = await axios.get(
          `https://graph.facebook.com/debug_token?input_token=${longToken}&access_token=${appAccessToken}`
        );
        console.log("debug_token response:", JSON.stringify(debugRes.data, null, 2));
      } catch (dbgErr) {
        console.warn("debug_token call failed:", dbgErr instanceof Error ? dbgErr.message : dbgErr);
      }

      try {
        console.log("Trying alternate user-scoped accounts call with perms field...");
        const userAccountsRes = await axios.get(
          `https://graph.facebook.com/${userRes.data.id}/accounts?fields=id,name,access_token,perms,category&access_token=${longToken}`
        );
        console.log("User accounts (with perms) response:", JSON.stringify(userAccountsRes.data, null, 2));
      } catch (uErr) {
        console.warn("User accounts (with perms) call failed:", uErr instanceof Error ? uErr.message : uErr);
      }

      console.log("Trying alternate API call with basic fields...");
      try {
        const altRes = await axios.get(
          `https://graph.facebook.com/me/accounts?access_token=${longToken}`
        );
        console.log("Alternate API response:", JSON.stringify(altRes.data, null, 2));
      } catch (altErr) {
        console.log("Alternate API call failed:", altErr instanceof Error ? altErr.message : altErr);
      }
    }

    if (!pagesRes.data.data || pagesRes.data.data.length === 0) {
      console.error("ERROR: No Facebook pages found");
      console.log("Response data:", JSON.stringify(pagesRes.data, null, 2));
      console.log("Common causes:");
      console.log("  - User is not an admin of any Facebook page");
      console.log("  - Page access permissions not granted during OAuth flow");
      console.log("  - The app doesn't have pages_show_list permission");

      const url = new URL("/dashboard", req.url);
      url.searchParams.set("error", "no_page");
      url.searchParams.set(
        "message",
        "No Facebook pages found. Make sure you're an admin of a Facebook page and granted page permissions."
      );
      return NextResponse.redirect(url);
    }

    const sessionUserId = req.cookies.get("userId")?.value;
    const stateUserId = state;
    const userId = stateUserId || sessionUserId || generateUserId(req);

    console.log("User ID Resolution:", {
      stateUserId: stateUserId ? "Found" : "Not found",
      sessionUserId: sessionUserId ? "Found" : "Not found",
      finalUserId: userId,
    });

    if (!stateUserId && !sessionUserId) {
      console.warn(
        "No authenticated user ID found, using IP-based fallback"
      );
    }

    console.log(`Step 6: Processing all ${pagesRes.data.data.length} page(s)...`);
    
    // Fetch Instagram accounts for all pages
    const pagesWithInstagram = await Promise.all(
      pagesRes.data.data.map(async (page: any) => {
        console.log(`\n--- Checking Instagram for page: ${page.name} (${page.id}) ---`);
        let igBusinessId = null;
        let igUsername = null;
        
        try {
          console.log(`Requesting Instagram Business Account for page ${page.id}...`);
          const igRes = await axios.get(
            `https://graph.facebook.com/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
          );
          console.log(`Instagram API Response for ${page.name}:`, JSON.stringify(igRes.data, null, 2));
          
          igBusinessId = igRes.data.instagram_business_account?.id;
          
          if (igBusinessId) {
            console.log(`✓ Instagram Business Account found: ${igBusinessId}`);
            try {
              const igUserRes = await axios.get(
                `https://graph.facebook.com/${igBusinessId}?fields=username,name,profile_picture_url&access_token=${page.access_token}`
              );
              console.log(`Instagram User Details:`, JSON.stringify(igUserRes.data, null, 2));
              igUsername = igUserRes.data.username;
              console.log(`✓ Instagram Username: @${igUsername}`);
            } catch (error) {
              console.error(`✗ Could not fetch Instagram username for page ${page.name}:`, error instanceof Error ? error.message : error);
            }
          } else {
            console.log(`✗ No Instagram Business Account linked to page ${page.name}`);
          }
        } catch (igError: any) {
          console.error(`✗ Instagram lookup failed for page ${page.name}:`, {
            message: igError?.message,
            response: igError?.response?.data,
            status: igError?.response?.status
          });
        }
        
        const result = {
          pageId: page.id,
          pageName: page.name,
          pageToken: page.access_token,
          category: page.category,
          tasks: page.tasks,
          igBusinessId: igBusinessId || undefined,
          igUsername: igUsername || undefined,
        };
        
        console.log(`Result for ${page.name}:`, {
          hasInstagram: !!igBusinessId,
          username: igUsername || 'Not connected'
        });
        
        return result;
      })
    );
    
    console.log("\n=== FINAL PAGES SUMMARY ===");
    console.log("Pages with Instagram data:", pagesWithInstagram.map(p => ({
      name: p.pageName,
      hasInstagram: !!p.igBusinessId,
      igUsername: p.igUsername || 'Not connected'
    })));
    console.log("========================\n");

    console.log("Step 7: Storing user with multiple pages...");
    await storeUserPages(userId, {
      accessToken: longToken,
      pages: pagesWithInstagram,
      userName: userRes.data.name,
      email: userRes.data.email,
      metaUserId: userRes.data.id,
      permissions: [
        "pages_show_list",
        "pages_read_engagement",
        "pages_manage_posts",
        "instagram_basic",
        "instagram_content_publish",
      ],
    });

    console.log("✓ User token stored successfully");

    const response = NextResponse.redirect(
      new URL("/dashboard?connected=true", req.url)
    );
    response.cookies.delete("userId");

    console.log("=== META CALLBACK SUCCESS ===");
    return response;
  } catch (err) {
    const error = err as {
      response?: { status: number; data: unknown; headers: unknown };
      message: string;
    };

    console.error("=== META CALLBACK ERROR ===");
    console.error("Error Message:", error.message);

    if (error.response) {
      console.error("HTTP Status:", error.response.status);
      console.error(
        "Response Data:",
        JSON.stringify(error.response.data, null, 2)
      );
      console.error(
        "Response Headers:",
        JSON.stringify(error.response.headers, null, 2)
      );
    }

    console.error("Full Error:", JSON.stringify(error, null, 2));

    return NextResponse.json(
      {
        error: "Token exchange failed",
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
