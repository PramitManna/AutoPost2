import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { checkRateLimit } from '@/lib/redis';

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
        const mimeType = url.includes('.png') ? 'image/png' : 'image/jpeg';

        return { data: base64, mimeType };
    } catch (error) {
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
        throw error;
    }
}

async function emptyRoom(imageUrl: string): Promise<{ url: string; publicId: string }> {
    try {
        const apiKey = process.env.GOOGLE_GENAI_API_KEY;
        
        if (!apiKey) {
            throw new Error('Missing API Key: GOOGLE_GENAI_API_KEY must be set');
        }

        const { data: base64Image, mimeType } = await downloadImageAsBase64(imageUrl);

        const requestBody = {
            contents: [
                {
                    parts: [
                        {
                            text: `
                            Remove only movable objects from this room, such as furniture (sofas, beds, chairs, tables, shelves), decorations, electronics, rugs, and any loose items. Do NOT add, modify, replace, or infer any new objects, textures, materials, lighting, or colors. Do NOT alter fixed architectural features such as walls, floors, ceilings, windows, doors, built-in fixtures, or permanent room structures.
Maintain the original room layout, perspective, proportions, colors, materials, lighting, shadows, and textures exactly as they appear.
Do not change the floor material, wall colors, window shapes, or any permanent surface. Simply show the room as it is, but empty of movable items—nothing more, nothing less. No assumptions, no additions, no replacements.
                            `
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

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            
            if (errorText.includes('API Key not found') || errorText.includes('API_KEY_INVALID')) {
                throw new Error('Invalid or expired API key');
            }
            
            throw new Error(`Gemini API error: ${errorText}`);
        }

        const responseData = await response.json();

        let generatedImageBase64: string | null = null;

        if (responseData.candidates?.[0]?.content?.parts) {
            for (const part of responseData.candidates[0].content.parts) {
                if (part.inlineData?.data || part.inline_data?.data) {
                    generatedImageBase64 = part.inlineData?.data || part.inline_data?.data;
                    break;
                }
            }
        }

        if (!generatedImageBase64) {
            throw new Error('No image generated in the response');
        }

        const uploadResult = await uploadToCloudinary(generatedImageBase64);

        return uploadResult;
    } catch (error) {
        if (error && typeof error === 'object' && ('status' in error || 'message' in error)) {
            const err = error as { status?: number; message?: string };
            if (err.status === 429 || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
                throw new Error('Gemini API quota exceeded');
            }
        }

        throw error;
    }
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

        const body: EmptyRoomRequest = await request.json();
        const { imageUrls, selectedIndices } = body;

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

        for (const index of selectedIndices) {
            if (index < 0 || index >= imageUrls.length) {
                return NextResponse.json(
                    { success: false, error: `Invalid image index: ${index}` },
                    { status: 400 }
                );
            }
        }

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
                errors.push({
                    index,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

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
