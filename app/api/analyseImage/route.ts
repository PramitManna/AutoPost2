import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import { checkRateLimit } from '@/lib/redis';
import {
  getCostOptimizedAnalysis,
  getOptimizationStats
} from '@/lib/cost-optimizer';

const IMAGE_PROCESSING_CONFIG = {
  size: 512,
  quality: 80,
  format: 'jpeg' as const,
};

const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
];

function getModelName(): string {
  return process.env.GEMINI_MODEL || GEMINI_MODELS[0];
}

async function performAIAnalysis(
  imageBuffers: Buffer[],
  listingInfo?: {
    address?: string;
    propertyType?: string;
    bedrooms?: string;
    bathrooms?: string;
    propertySize?: string;
    parking?: string;
    view?: string;
    city?: string;
    highlights?: string;
    agencyName?: string;
    brokerageName?: string;
  }
): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const modelName = getModelName();
    const model = ai.getGenerativeModel({ model: modelName });

    const base64Images = await Promise.all(
      imageBuffers.map(async (buffer) => {
        const image = sharp(buffer);
        const metadata = await image.metadata();

        let processedBuffer;
        if (metadata.format === 'png') {
          processedBuffer = await image
            .resize(IMAGE_PROCESSING_CONFIG.size, IMAGE_PROCESSING_CONFIG.size, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .png({ quality: 80, compressionLevel: 8 })
            .toBuffer();
        } else {
          processedBuffer = await image
            .resize(IMAGE_PROCESSING_CONFIG.size, IMAGE_PROCESSING_CONFIG.size, {
              fit: 'contain',
              background: { r: 255, g: 255, b: 255 }
            })
            .jpeg({
              quality: IMAGE_PROCESSING_CONFIG.quality,
              chromaSubsampling: '4:2:0'
            })
            .toBuffer();
        }
        return processedBuffer.toString('base64');
      })
    );

    const descriptions: string[] = [];

    let listingContext = '';
    if (listingInfo && Object.values(listingInfo).some(v => v)) {
      listingContext = `
LISTING INFORMATION:
- Address: ${listingInfo.address || 'Not specified'}
- Property Type: ${listingInfo.propertyType || 'Not specified'}
- Bedrooms: ${listingInfo.bedrooms || 'Not specified'}
- Bathrooms: ${listingInfo.bathrooms || 'Not specified'}
- Property Size: ${listingInfo.propertySize || 'Not specified'}
- Parking: ${listingInfo.parking || 'Not specified'}
- View: ${listingInfo.view || 'Not specified'}
- Location: ${listingInfo.city || 'Not specified'}
- Special Features: ${listingInfo.highlights || 'None'}
- Agency Name: ${listingInfo.agencyName || 'Not specified'}
- Brokerage Name: ${listingInfo.brokerageName || 'Not specified'}

When describing the images, incorporate these property details naturally into your description.
`;
    }

    const prompt = `
You are a professional real estate image analyst.
Your task is to describe EXACTLY what you see in this property image in rich, vivid detail.

Focus on:
- Architectural features and design elements
- Materials, finishes, and textures (e.g., hardwood floors, granite countertops, stainless steel appliances)
- Lighting (natural light, fixtures, ambiance)
- Layout and spatial flow
- Colors and aesthetic style
- Furniture and staging (if present)
- Views visible through windows
- Unique or standout features

IMPORTANT:
- Describe ONLY what is VISIBLE in this specific image
- Be detailed and specific (e.g., "chef's kitchen with waterfall island" not just "kitchen")
- Use sophisticated, evocative language
- DO NOT use markdown, asterisks, bullets, or special formatting
- DO NOT mention property specs like bedrooms/bathrooms unless clearly visible
- Write 3-5 sentences describing this space

Output ONLY the description, nothing else.
`;

    for (const base64Image of base64Images) {
      const imagePart = {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg"
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const description = response.text();
      descriptions.push(description);
    }

    if (descriptions.length > 1) {
      const finalPrompt = `
You are an elite real estate copywriter.
Your task is to create ONE compelling property caption by combining the image descriptions below with the listing details.

CRITICAL: Your output must be PLAIN TEXT ONLY. Do NOT use any special formatting characters like asterisks, underscores, hashtags, or bullet points.

EXACT OUTPUT FORMAT REQUIRED:

- Property Type: [Value from listing info or "Not specified"]
- Bedrooms: [Value from listing info or "Not specified"]
- Bathrooms: [Value from listing info or "Not specified"]
- Property Size: [Value from listing info or "Not specified"]
- Parking: [Value from listing info or "Not specified"]
- View: [Value from listing info or "Not specified"]
- Location: [Value from listing info or "Not specified"]
- Special Features: [Value from listing info or "None"]

[BLANK LINE]

[A flowing 2-4 sentence description that:
- Naturally incorporates ALL listing details
- Weaves in the visual details from the image descriptions
- Uses sophisticated, evocative language]

EXAMPLE OUTPUT:

- Property Type: Townhome
- Bedrooms: 4
- Bathrooms: 3
- Property Size: 1,938 sqft
- Parking: Side-street
- View: Greenery
- Location: East Newton, Surrey
- Special Features: Waterfall island

Discover this charming 4-bedroom, 3-bathroom townhome, encompassing 1,938 sqft of thoughtfully designed living space. The open-concept layout features a modern kitchen with waterfall island, bright dining and living areas, and large windows that bring in natural light. Surrounded by greenery with plenty of side-street parking in East Newton, Surrey, this home blends style, comfort, and everyday convenience.

CRITICAL RULES:
1. DO NOT invent or guess the location. Use ONLY the location provided in the listing details. If no location is provided, use "Not specified".
2. DO NOT use asterisks, bold, italics, or any markdown formatting.
3. DO NOT use emojis or hashtags.
4. DO start with the structured list exactly as shown in the example.
5. DO incorporate ALL listing details naturally into the narrative description.
6. DO weave in visual details from the image descriptions.
7. DO use a blank line between the list and the description.

IMAGE DESCRIPTIONS:
${descriptions.map((desc, index) => `Image ${index + 1}: ${desc}`).join('\n\n')}

${listingContext}

NOW: Create the final property caption following the EXACT format above. Combine the image descriptions with the listing information into one polished, flowing narrative. Output ONLY the caption text, nothing else.
`;

      const finalResult = await model.generateContent(finalPrompt);
      const finalResponse = await finalResult.response;
      return finalResponse.text();
    } else {
      // Single image - still need to format with listing details
      const singleImagePrompt = `
You are an elite real estate copywriter.
Your task is to create ONE compelling property caption by combining the image description below with the listing details.

CRITICAL: Your output must be PLAIN TEXT ONLY. Do NOT use any special formatting characters like asterisks, underscores, hashtags, or bullet points.

EXACT OUTPUT FORMAT REQUIRED:

- Property Type: [Value from listing info or "Not specified"]
- Bedrooms: [Value from listing info or "Not specified"]
- Bathrooms: [Value from listing info or "Not specified"]
- Property Size: [Value from listing info or "Not specified"]
- Parking: [Value from listing info or "Not specified"]
- View: [Value from listing info or "Not specified"]
- Location: [Value from listing info or "Not specified"]
- Special Features: [Value from listing info or "None"]

[BLANK LINE]

[A flowing 2-4 sentence description that:
- Naturally incorporates ALL listing details
- Weaves in the visual details from the image description
- Uses sophisticated, evocative language]

EXAMPLE OUTPUT:

- Property Type: Townhome
- Bedrooms: 4
- Bathrooms: 3
- Property Size: 1,938 sqft
- Parking: Side-street
- View: Greenery
- Location: East Newton, Surrey
- Special Features: Waterfall island

Discover this charming 4-bedroom, 3-bathroom townhome, encompassing 1,938 sqft of thoughtfully designed living space. The open-concept layout features a modern kitchen with waterfall island, bright dining and living areas, and large windows that bring in natural light. Surrounded by greenery with plenty of side-street parking in East Newton, Surrey, this home blends style, comfort, and everyday convenience.

CRITICAL RULES:
1. DO NOT invent or guess the location. Use ONLY the location provided in the listing details. If no location is provided, use "Not specified".
2. DO NOT use asterisks, bold, italics, or any markdown formatting.
3. DO NOT use emojis or hashtags.
4. DO start with the structured list exactly as shown in the example.
5. DO incorporate ALL listing details naturally into the narrative description.
6. DO weave in visual details from the image description.
7. DO use a blank line between the list and the description.

IMAGE DESCRIPTION:
${descriptions[0]}

${listingContext}

NOW: Create the final property caption following the EXACT format above. Combine the image description with the listing information into one polished narrative. Output ONLY the caption text, nothing else.
`;

      const singleResult = await model.generateContent(singleImagePrompt);
      const singleResponse = await singleResult.response;
      return singleResponse.text();
    }
  } catch (error) {
    console.error('Error in performAIAnalysis:', error);
    throw error;
  }
}

export async function analyzeMultipleImages(
  imageBuffers: Buffer[],
  useCache = true,
  listingInfo?: {
    address?: string;
    propertyType?: string;
    bedrooms?: string;
    bathrooms?: string;
    propertySize?: string;
    parking?: string;
    view?: string;
    city?: string;
    highlights?: string;
    agencyName?: string;
    brokerageName?: string;
  }
): Promise<string> {
  if (!useCache) {
    return await performAIAnalysis(imageBuffers, listingInfo);
  }
  return await getCostOptimizedAnalysis(imageBuffers, (buffers) => performAIAnalysis(buffers, listingInfo));
}

export async function analyzeSingleImage(imageBuffer: Buffer): Promise<string> {
  return analyzeMultipleImages([imageBuffer]);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const identifier = forwardedFor || realIp || 'anonymous';

    const rateLimitResult = await checkRateLimit(identifier);

    if (!rateLimitResult.success) {
      const waitTime = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Please wait ${waitTime} seconds.`,
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
          reset: new Date(rateLimitResult.reset).toISOString(),
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            'Retry-After': waitTime.toString(),
          }
        }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Service configuration error' },
        { status: 500 }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content type must be multipart/form-data' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const imageBuffers: Buffer[] = [];
    let listingInfo = {};
    let totalSize = 0;
    const MAX_TOTAL_SIZE = 10 * 1024 * 1024;
    const MAX_IMAGES = 10;

    for (const [key, value] of formData.entries()) {
      if (key === 'listingInfo' && typeof value === 'string') {
        try {
          listingInfo = JSON.parse(value);
        } catch (e) {
          console.warn('Failed to parse listing info:', e);
        }
      } else if (key.startsWith('image') && value instanceof File) {
        if (imageBuffers.length >= MAX_IMAGES) {
          return NextResponse.json(
            { error: `Maximum ${MAX_IMAGES} images allowed` },
            { status: 400 }
          );
        }

        totalSize += value.size;
        if (totalSize > MAX_TOTAL_SIZE) {
          return NextResponse.json(
            { error: `Total file size must be under ${MAX_TOTAL_SIZE / 1024 / 1024}MB` },
            { status: 400 }
          );
        }

        const arrayBuffer = await value.arrayBuffer();
        imageBuffers.push(Buffer.from(arrayBuffer));
      }
    }

    if (imageBuffers.length === 0) {
      return NextResponse.json(
        { error: 'No valid images found' },
        { status: 400 }
      );
    }

    const description = await analyzeMultipleImages(imageBuffers, true, listingInfo);
    const optimizationStats = getOptimizationStats();

    return NextResponse.json({
      success: true,
      description,
      imageCount: imageBuffers.length,
      metrics: {
        analysisTime: `${Date.now() - startTime}ms`,
        costOptimization: optimizationStats.isOptimal ? 'Optimal' : 'Standard'
      }
    }, {
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.reset.toString(),
        'X-Cost-Savings': `$${optimizationStats.estimatedCostSaved.toFixed(2)}`,
      }
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    return NextResponse.json(
      {
        error: 'Image analysis failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Image Analysis API is running',
    usage: 'POST multipart/form-data with images',
  });
}
