import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function POST(req: NextRequest) {
  try {
    const { imageUrls, caption, igBusinessId, accessToken } = await req.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "imageUrls must be a non-empty array" },
        { status: 400 }
      );
    }

    if (imageUrls.length > 10) {
      return NextResponse.json(
        { error: "Instagram carousel supports maximum 10 images" },
        { status: 400 }
      );
    }

    if (!caption || !igBusinessId || !accessToken) {
      return NextResponse.json(
        { error: "Missing required fields: caption, igBusinessId, accessToken" },
        { status: 400 }
      );
    }

    console.log("📤 Publishing carousel to Instagram...");
    console.log("IG Business ID:", igBusinessId);
    console.log("Caption:", caption);
    console.log("Number of images:", imageUrls.length);

    // Step 1: Create media containers for each image
    const mediaIds = [];
    
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i];
      console.log(`📷 Creating container for image ${i + 1}/${imageUrls.length}:`, imageUrl);

      const containerRes = await axios.post(
        `https://graph.facebook.com/v21.0/${igBusinessId}/media`,
        {
          image_url: imageUrl,
          is_carousel_item: true,
          media_type: "IMAGE"
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      mediaIds.push(containerRes.data.id);
      console.log(`✅ Container ${i + 1} created:`, containerRes.data.id);
    }

    // Step 2: Create carousel container
    console.log("📦 Creating carousel container...");
    const carouselRes = await axios.post(
      `https://graph.facebook.com/v21.0/${igBusinessId}/media`,
      {
        caption: caption,
        media_type: "CAROUSEL",
        children: mediaIds.join(',')
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const carouselId = carouselRes.data.id;
    console.log("✅ Carousel container created:", carouselId);

    // Step 3: Wait for media to be ready (Instagram needs time to process)
    console.log("⏳ Waiting for Instagram to process media containers...");
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds

    // Step 4: Publish the carousel with retry logic
    let publishRes;
    const retries = 3;
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`📤 Publishing attempt ${attempt}/${retries}...`);
        
        publishRes = await axios.post(
          `https://graph.facebook.com/v21.0/${igBusinessId}/media_publish`,
          {
            creation_id: carouselId
          },
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );

        console.log("✅ Instagram carousel published:", publishRes.data);
        break; // Success! Exit the retry loop

      } catch (retryError) {
        const err = retryError as { response?: { data?: { error?: { error_subcode?: number; message?: string } } }; message: string };
        lastError = err;
        
        // Check if it's a "media not ready" error
        if (err.response?.data?.error?.error_subcode === 2207027) {
          console.log(`⚠️ Media not ready yet, waiting before retry ${attempt}/${retries}...`);
          
          if (attempt < retries) {
            // Wait progressively longer (2s, 4s, 6s)
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        } else {
          // Different error, don't retry
          throw err;
        }
      }
    }

    // If we exhausted retries, throw the last error
    if (!publishRes) {
      console.error("❌ Failed to publish after all retries");
      throw lastError;
    }

    return NextResponse.json({
      success: true,
      postId: publishRes.data.id,
      message: `Posted ${imageUrls.length} images carousel to Instagram successfully!`,
      mediaCount: imageUrls.length,
    });

  } catch (error) {
    const err = error as { response?: { status: number; data: unknown }; message: string };
    console.error("❌ Instagram carousel publishing error:", err);
    
    if (err.response) {
      console.error("Error response:", err.response.data);
      return NextResponse.json(
        { 
          error: "Instagram API error", 
          details: err.response.data 
        },
        { status: err.response.status || 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to publish carousel to Instagram", details: err.message },
      { status: 500 }
    );
  }
}
