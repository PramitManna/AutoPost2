import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        return NextResponse.redirect(
          new URL(`/connect?error=${encodeURIComponent(error.message)}`, request.url)
        );
      }

      if (data.session) {
        // Get the provider and social account token from user metadata
        const user = data.session.user;
        const identities = user.identities || [];
        const identity = identities[0];
        const provider = identity?.provider || 'google';

        // For Twitter/X: extract the access token from session
        let socialAccountToken = user.user_metadata?.socialAccountToken;
        
        if (provider === 'twitter' && data.session.provider_token) {
          socialAccountToken = data.session.provider_token;
        } else if (provider === 'google' && data.session.provider_token) {
          socialAccountToken = data.session.provider_token;
        }

        // Update user metadata with social account token
        if (socialAccountToken) {
          await supabase.auth.updateUser({
            data: {
              ...user.user_metadata,
              socialAccountToken,
              provider,
            },
          });
        }

        // Redirect to /connect page for Meta connection
        return NextResponse.redirect(
          new URL('/connect', request.url)
        );
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      return NextResponse.redirect(
        new URL(
          `/connect?error=${encodeURIComponent('An error occurred during authentication')}`,
          request.url
        )
      );
    }
  }

  // URL is malformed or missing code
  return NextResponse.redirect(
    new URL('/connect?error=Missing_authentication_code', request.url)
  );
}
