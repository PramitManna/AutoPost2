import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { checkRateLimit } from '@/lib/redis';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface EmptyRoomRequest {
    imageUrls: string[];
    selectedIndices: number[];
}

interface EmptyRoomResponse {
    success: boolean;
    processedImages: {
        url: string;
        publicId: string;
        index: number;
    }[];
    error?: string;
}

async function downloadImageAsBase64(url: string): Promise<{ data: string; mimeType: string }> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image: ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString('base64');

        // Determine mime type from URL or default to jpeg
        const mimeType = url.includes('.png') ? 'image/png' : 'image/jpeg';

        return { data: base64, mimeType };
    } catch (error) {
        console.error('Error downloading image:', error);
        throw error;
    }
}

async function uploadToCloudinary(base64Image: string): Promise<{ url: string; publicId: string }> {
    try {
        const result = await cloudinary.uploader.upload(`data:image/png;base64,${base64Image}`, {
            folder: 'autopost/empty-rooms',
            resource_type: 'image',
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        console.error('Error uploading to Cloudinary:', error);
        throw error;
    }
}

async function emptyRoom(imageUrl: string): Promise<{ url: string; publicId: string }> {
    try {
        // Get API key from environment
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        
        console.log('🔍 Debug - Environment check:', {
            hasKey: !!apiKey,
            keyLength: apiKey?.length,
            keyStart: apiKey?.substring(0, 15) + '...',
        });
        
        if (!apiKey) {
            throw new Error('Missing API Key: GOOGLE_GENAI_API_KEY must be set');
        }

        console.log('🔑 Using API key for Gemini API');

        // Download the image
        const { data: base64Image, mimeType } = await downloadImageAsBase64(imageUrl);

        console.log('📥 Image downloaded successfully');

        // Prepare the request body for REST API
        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: "Remove all furniture, decorations, and objects from this room. Show only the empty space with walls, floors, ceiling, windows, and architectural features. Maintain the original lighting, perspective, and room dimensions. Keep the room's structure, colors, and architectural details exactly as they are."
                        },
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: base64Image
                            }
                        }
                    ]
                }
            ]
        };

        console.log('🎨 Generating empty room image with Gemini API...');

        // Use REST API directly with proper authentication
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
        
        // Debug: log the URL structure (without revealing full key)
        console.log('📡 API URL structure:', {
            baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
            hasKeyParam: apiUrl.includes('?key='),
            keyLength: apiKey.length,
            fullUrlLength: apiUrl.length
        });
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        console.log('📨 Response status:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Gemini API error:', errorText);
            
            // Provide helpful error message for API key issues
            if (errorText.includes('API Key not found') || errorText.includes('API_KEY_INVALID')) {
                throw new Error(
                    'Invalid or expired API key. Please:\n' +
                    '1. Go to https://aistudio.google.com/app/apikey\n' +
                    '2. Create a new API key for Gemini\n' +
                    '3. Update GOOGLE_GENAI_API_KEY in your .env.local file\n' +
                    '4. Restart your development server\n\n' +
                    `API Error: ${errorText}`
                );
            }
            
            throw new Error(`Gemini API error: ${errorText}`);
        }

        const responseData = await response.json();

        console.log('✅ Gemini API response received');

        // Extract the generated image from the response
        let generatedImageBase64: string | null = null;

        // Access the response structure from REST API
        if (responseData.candidates?.[0]?.content?.parts) {
            for (const part of responseData.candidates[0].content.parts) {
                if (part.inlineData?.data || part.inline_data?.data) {
                    generatedImageBase64 = part.inlineData?.data || part.inline_data?.data;
                    console.log('🖼️ Image data extracted from response');
                    break;
                }
            }
        }

        if (!generatedImageBase64) {
            console.error('❌ No image data found in response:', JSON.stringify(responseData, null, 2));
            throw new Error('No image generated in the response');
        }

        // Upload the generated image to Cloudinary
        const uploadResult = await uploadToCloudinary(generatedImageBase64);

        return uploadResult;
    } catch (error) {
        console.error('Error in emptyRoom:', error);

        // Handle quota/billing errors specifically
        if (error && typeof error === 'object' && ('status' in error || 'message' in error)) {
            const err = error as { status?: number; message?: string };
            if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
                throw new Error(
                    'Gemini API quota exceeded. This usually means:\n' +
                    '1. You are using a FREE TIER API key instead of a PAID one\n' +
                    '2. Billing is not enabled in your Google Cloud project\n' +
                    '3. You need to check your API key at: https://ai.google.dev/gemini-api/docs/api-key\n' +
                    '4. Verify billing at: https://console.cloud.google.com/billing\n\n' +
                    `Original error: ${err.message}`
                );
            }
        }

        throw error;
    }
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Rate limiting
        const forwardedFor = request.headers.get('x-forwarded-for');
        const realIp = request.headers.get('x-real-ip');
        const identifier = forwardedFor || realIp || 'anonymous';

        const rateLimitResult = await checkRateLimit(identifier);

        if (!rateLimitResult.success) {
            const waitTime = Math.ceil((rateLimitResult.reset - Date.now()) / 1000);
            return NextResponse.json(
                {
                    success: false,
                    error: 'Rate limit exceeded',
                    message: `Please wait ${waitTime} seconds.`,
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

        // Validate environment variables
        if (!process.env.GOOGLE_GENAI_API_KEY) {
            return NextResponse.json(
                { success: false, error: 'Service configuration error: Missing GOOGLE_GENAI_API_KEY' },
                { status: 500 }
            );
        }

        if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
            return NextResponse.json(
                { success: false, error: 'Service configuration error: Missing Cloudinary credentials' },
                { status: 500 }
            );
        }

        // Parse request body
        const body: EmptyRoomRequest = await request.json();
        const { imageUrls, selectedIndices } = body;

        // Validate input
        if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No image URLs provided' },
                { status: 400 }
            );
        }

        if (!selectedIndices || !Array.isArray(selectedIndices) || selectedIndices.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No images selected for processing' },
                { status: 400 }
            );
        }

        // Validate selected indices
        for (const index of selectedIndices) {
            if (index < 0 || index >= imageUrls.length) {
                return NextResponse.json(
                    { success: false, error: `Invalid image index: ${index}` },
                    { status: 400 }
                );
            }
        }

        // Process selected images
        const processedImages: { url: string; publicId: string; index: number }[] = [];
        const errors: { index: number; error: string }[] = [];

        for (const index of selectedIndices) {
            try {
                const imageUrl = imageUrls[index];
                const result = await emptyRoom(imageUrl);
                processedImages.push({
                    ...result,
                    index,
                });
            } catch (error) {
                console.error(`Error processing image at index ${index}:`, error);
                errors.push({
                    index,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        // Return response
        const response: EmptyRoomResponse = {
            success: processedImages.length > 0,
            processedImages,
        };

        if (errors.length > 0) {
            response.error = `Failed to process ${errors.length} image(s): ${errors.map(e => `Index ${e.index}: ${e.error}`).join(', ')}`;
        }

        return NextResponse.json(response, {
            status: processedImages.length > 0 ? 200 : 500,
            headers: {
                'X-Processing-Time': `${Date.now() - startTime}ms`,
                'X-RateLimit-Limit': rateLimitResult.limit.toString(),
                'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
                'X-RateLimit-Reset': rateLimitResult.reset.toString(),
            }
        });

    } catch (error) {
        console.error('Empty room API error:', error);
        return NextResponse.json(
            {
                success: false,
                error: 'Failed to process images',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'Empty Room API is running',
        usage: 'POST with { imageUrls: string[], selectedIndices: number[] }',
        model: 'gemini-2.5-flash-image',
    });
}
