import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/token-manager';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
    try {
        const email = req.nextUrl.searchParams.get('email') || 'pramitmanna19@gmail.com';

        await connectToDatabase();

        // 1. Direct DB check to see if token exists in DB
        const userRaw = await User.findOne({ email }).select('+pages.encryptedPageToken');
        const rawPageToken = userRaw?.pages?.[0]?.encryptedPageToken;

        // 2. Test the fixed function
        const result = await getUserByEmail(email);

        if (!result) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        const { user } = result;

        // Check if pages have encryptedPageToken
        // We need to access the raw mongoose document or check if the field is present
        // Since we can't easily check private fields on the interface, we'll try to decrypt

        let decryptionResult = 'Not attempted';
        let pageTokenFound = false;

        if (user.pages && user.pages.length > 0) {
            const page = user.pages[0];
            // @ts-ignore - accessing hidden field for test
            pageTokenFound = !!page.encryptedPageToken;

            try {
                const decrypted = user.getDecryptedPageToken(page.pageId);
                decryptionResult = decrypted ? 'Success (Token length: ' + decrypted.length + ')' : 'Failed (Empty)';
            } catch (e: any) {
                decryptionResult = 'Error: ' + e.message;
            }
        }

        return NextResponse.json({
            email,
            rawDbCheck: {
                hasPages: userRaw?.pages && userRaw.pages.length > 0,
                firstPageHasToken: !!rawPageToken
            },
            fixCheck: {
                hasPages: user.pages && user.pages.length > 0,
                // @ts-ignore
                firstPageHasEncryptedToken: pageTokenFound,
                decryptionResult
            }
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
    }
}
