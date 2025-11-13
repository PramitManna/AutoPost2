import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import sharp from 'sharp';
import {
  checkRateLimit,
  generateImageHash,
  getCachedAnalysis,
  setCachedAnalysis,
  getMemoryCachedAnalysis,
  setMemoryCachedAnalysis,
} from '@/lib/redis';

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

export async function analyzeMultipleImages(
  imageBuffers: Buffer[],
  useCache = true
): Promise<string> {
    try {
        console.log('Starting analysis of multiple images...');
        
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }

        let cacheHash: string | null = null;
        if (useCache) {
          cacheHash = await generateImageHash(imageBuffers);
          console.log('Cache key:', cacheHash.substring(0, 16) + '...');

          const cachedResult = await getCachedAnalysis(cacheHash);
          if (cachedResult) {
            console.log('Returning cached result (Redis)');
            return cachedResult;
          }

          const memoryCached = getMemoryCachedAnalysis(cacheHash);
          if (memoryCached) {
            console.log('Returning cached result (Memory)');
            return memoryCached;
          }
        }
        
        const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelName = getModelName();
        const model = ai.getGenerativeModel({ model: modelName });
        console.log(`Using AI model: ${modelName}`);

        const base64Images = await Promise.all(
            imageBuffers.map(async (buffer) => {
                const processedBuffer = await sharp(buffer)
                    .resize(IMAGE_PROCESSING_CONFIG.size, IMAGE_PROCESSING_CONFIG.size, { 
                      fit: 'contain', 
                      background: { r: 255, g: 255, b: 255 } 
                    })
                    .normalize()
                    .modulate({ brightness: 1.1, saturation: 1.2, hue: 0 })
                    .sharpen({ sigma: 1, m1: 0.5, m2: 0.3 })
                    .median(1)
                    .linear(1.1, -(5 / 255))
                    .jpeg({ 
                      quality: IMAGE_PROCESSING_CONFIG.quality, 
                      chromaSubsampling: '4:4:4' 
                    })
                    .toBuffer();
                return processedBuffer.toString('base64');
            })
        );
        console.log(`📸 Processed ${base64Images.length} images for AI analysis`);

        const descriptions: string[] = [];
        const prompt = `
You are a professional real estate marketing assistant.
Your task is to analyze the provided property image and generate a refined, visually detailed, and compelling short description of the property.

Guidelines:
- Limit the output in a very detailed to the point 2 to 3 sentences.
- Describe only what can be visually inferred from the image.
- Use polished, brochure-style language that highlights key features, design, and ambiance.
- Mention specific visible attributes (e.g., natural lighting, materials, furnishings, colors, view, spatial layout).
- Maintain a sophisticated and professional tone suitable for premium real estate listings.
- Do NOT include emojis, hashtags, or pricing details.
- Keep grammar, flow, and word choice natural and elegant.
- Mention every single detail you see in the image which will be relevant for the property description as well as proper views.

Here are a few examples for reference:

---

Example 1:
Input: [A spacious modern living room with floor-to-ceiling windows, light wood flooring, and city skyline view.]
Output: "An expansive contemporary living space featuring floor-to-ceiling glass panels, warm oak flooring, and an uninterrupted view of the city skyline."

---

Example 2:
Input: [A villa with a landscaped garden, outdoor pool, and modern architecture.]
Output: "A luxurious villa that blends sleek modern architecture with tranquil green landscaping, complete with a private pool and open-air lounging area."

---

Example 3:
Input: [A cozy studio apartment with minimalist furnishings and natural sunlight streaming through large windows.]
Output: "A thoughtfully designed studio apartment showcasing minimalist interiors, soft neutral tones, and abundant natural light through broad glass windows."

---

Example 4:
Input: [A high-end kitchen with marble countertops, pendant lighting, and built-in appliances.]
Output: "A sophisticated kitchen featuring polished marble countertops, elegant pendant lighting, and state-of-the-art built-in appliances."

---

Now, analyze the following property image and generate one professional, concise, and visually grounded description that matches the above style and tone.
`;

        // Analyze each image
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
            console.log(`Generated description for image: ${description}`);
        }

        // If multiple images, synthesize descriptions
        if (descriptions.length > 1) {
            const finalPrompt = `
You are a professional real estate marketing assistant.
Your task is to synthesize the following individual property descriptions into a single, cohesive, and compelling summary.

Guidelines:
- Combine the key features and highlights from each description into a unified narrative.
- Maintain a polished, brochure-style language that emphasizes the overall appeal of the property.
- Ensure the summary flows naturally and elegantly, avoiding repetition.
- Keep the tone sophisticated and professional, suitable for premium real estate listings.
- Limit the final summary to 4-5 sentences.
- Mention every single detail from the description that would be relevant for the property description as well as proper views.

Here are the individual descriptions to synthesize:
${descriptions.map((desc, index) => `Description ${index + 1}: ${desc}`).join('\n\n')}
`;

            const finalResult = await model.generateContent(finalPrompt);
            const finalResponse = await finalResult.response;
            const finalDescription = finalResponse.text();
            console.log('Final synthesized description:', finalDescription);
            
            if (useCache && cacheHash) {
              await setCachedAnalysis(cacheHash, finalDescription);
              setMemoryCachedAnalysis(cacheHash, finalDescription);
            }
            
            return finalDescription;
        } else {
            const singleDescription = descriptions[0];
            
            if (useCache && cacheHash) {
              await setCachedAnalysis(cacheHash, singleDescription);
              setMemoryCachedAnalysis(cacheHash, singleDescription);
            }
            
            return singleDescription;
        }
    } catch (error) {
        console.error('Error in analyzeMultipleImages:', error);
        throw error;
    }
}

// Export for potential reuse in other routes
export async function analyzeSingleImage(imageBuffer: Buffer): Promise<string> {
    return analyzeMultipleImages([imageBuffer]);
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();
    
    try {
        console.log('🔍 Starting image analysis request...');
        
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const identifier = forwardedFor || realIp || 'anonymous';
        
        console.log(`👤 Request from: ${identifier}`);
        
        const rateLimitResult = await checkRateLimit(identifier);
        
        if (!rateLimitResult.success) {
            const resetDate = new Date(rateLimitResult.reset);
            const waitTime = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
            
            console.warn(`⚠️ Rate limit exceeded for ${identifier}`);
            
            return NextResponse.json(
                { 
                    error: 'Rate limit exceeded',
                    message: `You can make ${rateLimitResult.limit} requests per minute. Please wait ${waitTime} seconds.`,
                    limit: rateLimitResult.limit,
                    remaining: rateLimitResult.remaining,
                    reset: resetDate.toISOString(),
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
        
        console.log(`✅ Rate limit check passed (${rateLimitResult.remaining}/${rateLimitResult.limit} remaining)`);
        
        if (!process.env.GEMINI_API_KEY) {
            console.error('❌ GEMINI_API_KEY is not configured!');
            
            return NextResponse.json(
                { 
                    error: 'Service configuration error',
                    hint: 'AI analysis service is not properly configured'
                },
                { status: 500 }
            );
        }

        console.log('✅ GEMINI_API_KEY configured');

        const contentType = request.headers.get('content-type') || '';
        
        if (!contentType.includes('multipart/form-data')) {
            return NextResponse.json(
                { error: 'Content type must be multipart/form-data' },
                { status: 400 }
            );
        }

        const formData = await request.formData();
        const imageBuffers: Buffer[] = [];
        let totalSize = 0;
        const MAX_TOTAL_SIZE = 10 * 1024 * 1024; 
        const MAX_IMAGES = 10;

        for (const [key, value] of formData.entries()) {
            if (key.startsWith('image') && value instanceof File) {
                if (imageBuffers.length >= MAX_IMAGES) {
                  console.warn(`⚠️ Too many images (max ${MAX_IMAGES})`);
                  return NextResponse.json(
                    { error: `Maximum ${MAX_IMAGES} images allowed` },
                    { status: 400 }
                  );
                }
                
                console.log(`📸 Processing image: ${value.name}, size: ${(value.size / 1024).toFixed(2)}KB`);
                
                totalSize += value.size;
                
                // Check total size limit
                if (totalSize > MAX_TOTAL_SIZE) {
                  console.warn(`⚠️ Total file size exceeds ${MAX_TOTAL_SIZE / 1024 / 1024}MB`);
                  return NextResponse.json(
                    { error: `Total file size must be under ${MAX_TOTAL_SIZE / 1024 / 1024}MB` },
                    { status: 400 }
                  );
                }
                
                const arrayBuffer = await value.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);
                imageBuffers.push(buffer);
            }
        }

        if (imageBuffers.length === 0) {
            return NextResponse.json(
                { error: 'No valid images found in the request' },
                { status: 400 }
            );
        }

        console.log(`📊 Processing ${imageBuffers.length} images (total: ${(totalSize / 1024).toFixed(2)}KB)`);

        const analysisStartTime = Date.now();
        const description = await analyzeMultipleImages(imageBuffers, true);
        const analysisTime = Date.now() - analysisStartTime;

        const totalTime = Date.now() - startTime;
        console.log(`✅ Image analysis completed in ${analysisTime}ms (total: ${totalTime}ms)`);
        console.log('📝 Generated description:', description.substring(0, 100) + '...');
        
        return NextResponse.json({
            success: true,
            description,
            imageCount: imageBuffers.length,
            message: `Successfully analyzed ${imageBuffers.length} image(s)`,
            metrics: {
              analysisTime: `${analysisTime}ms`,
              totalTime: `${totalTime}ms`,
              imageSize: `${(totalSize / 1024).toFixed(2)}KB`,
            }
        }, {
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString(),
          }
        });

    } catch (error) {
        console.error('❌ Image analysis error:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return NextResponse.json(
            { 
                error: 'Image analysis failed', 
                details: errorMessage,
                success: false
            },
            { status: 500 }
        );
    }
}

// Optional: Handle GET requests to test the endpoint
export async function GET() {
    return NextResponse.json({
        message: 'Image Analysis API is running',
        usage: 'Send a POST request with multipart/form-data containing image files',
        supportedFormats: ['JPEG', 'PNG', 'WebP'],
        maxImages: 'Multiple images supported'
    });
}
