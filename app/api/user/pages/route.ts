import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

// GET /api/user/pages?userId=xxx - Get all pages for a user
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ userId });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Return pages without sensitive token data
    const pages = (user.pages || []).map((page: any) => ({
      pageId: page.pageId,
      pageName: page.pageName,
      category: page.category,
      tasks: page.tasks,
      igBusinessId: page.igBusinessId,
      igUsername: page.igUsername,
      isActive: page.pageId === user.activePageId,
    }));

    return NextResponse.json({
      pages,
      activePageId: user.activePageId,
    });
  } catch (error) {
    console.error("Error fetching user pages:", error);
    return NextResponse.json(
      { error: "Failed to fetch pages" },
      { status: 500 }
    );
  }
}

// POST /api/user/pages - Set active page
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, pageId } = body;

    if (!userId || !pageId) {
      return NextResponse.json(
        { error: "userId and pageId are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const user = await User.findOne({ userId });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Verify the page exists in user's pages
    const pageExists = user.pages?.some((p: any) => p.pageId === pageId);
    if (!pageExists) {
      return NextResponse.json(
        { error: "Page not found in user's pages" },
        { status: 404 }
      );
    }

    // Set active page
    user.activePageId = pageId;
    
    // Also update legacy fields for backwards compatibility
    const activePage = user.pages?.find((p: any) => p.pageId === pageId);
    if (activePage) {
      user.pageId = activePage.pageId;
      user.pageName = activePage.pageName;
      user.igBusinessId = activePage.igBusinessId;
      user.igUsername = activePage.igUsername;
    }
    
    await user.save();

    return NextResponse.json({
      success: true,
      activePageId: user.activePageId,
      message: `Active page set to: ${activePage?.pageName}`,
    });
  } catch (error) {
    console.error("Error setting active page:", error);
    return NextResponse.json(
      { error: "Failed to set active page" },
      { status: 500 }
    );
  }
}
