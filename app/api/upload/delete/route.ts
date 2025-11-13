import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary from env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

async function destroy(publicId: string) {
  try {
    const res = await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
      invalidate: true, // purge cached versions via CDN
    });

    // Cloudinary returns { result: 'ok' | 'not found' | 'error' | ... }
    const ok = res.result === "ok" || res.result === "not found";
    return NextResponse.json(
      {
        success: ok,
        publicId,
        result: res.result,
      },
      { status: ok ? 200 : 400 }
    );
  } catch (error) {
    console.error("❌ Cloudinary destroy error:", error);
    return NextResponse.json(
      { error: "Failed to delete image from Cloudinary", publicId },
      { status: 500 }
    );
  }
}

// DELETE /api/upload/delete?publicId=folder/my_image_id
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const publicId = searchParams.get("publicId");

  if (!publicId) {
    return NextResponse.json(
      { error: "Missing 'publicId' query parameter" },
      { status: 400 }
    );
  }

  return destroy(publicId);
}

// POST /api/upload/delete  { "publicId": "folder/my_image_id" }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>));
    const publicId = (body?.publicId as string) || "";

    if (!publicId) {
      return NextResponse.json(
        { error: "Missing 'publicId' in JSON body" },
        { status: 400 }
      );
    }

    return destroy(publicId);
  } catch (err) {
    console.error("❌ Delete endpoint error:", err);
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }
}
