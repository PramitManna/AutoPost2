import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    console.log(
      "📤 Processing image:",
      file.name,
      `(${(file.size / 1024 / 1024).toFixed(2)}MB)`
    );

    const buffer = Buffer.from(await file.arrayBuffer());

    console.log("🔄 Processing with Sharp...");
    const processedBuffer = await sharp(buffer)
      .resize(1920, 1920, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer();

    const base64Image = `data:image/jpeg;base64,${processedBuffer.toString(
      "base64"
    )}`;

    // Generate unique cloudinary public_id
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const publicId = `uploads/${timestamp}_${randomString}`;

    console.log("☁️ Uploading to Cloudinary:", publicId);

    // Upload to Cloudinary (no local saving)
    const uploadResponse = await cloudinary.uploader.upload(base64Image, {
      public_id: publicId,
      folder: "uploads", // optional
      overwrite: true,
      resource_type: "image",
    });

    console.log("✅ Uploaded to Cloudinary:", uploadResponse.secure_url);

    return NextResponse.json({
      success: true,
      url: uploadResponse.secure_url,
      filename: uploadResponse.public_id,
      size: processedBuffer.length,
      dimensions: {
        width: uploadResponse.width,
        height: uploadResponse.height,
      },
      provider: "cloudinary",
    });
  } catch (error) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { error: "Failed to process or upload image" },
      { status: 500 }
    );
  }
}
