import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type AuthUser = {
  id: string;
  email: string;
  user_metadata: {
    name?: string;
    avatar_url?: string;
  };
};

export type AuthSession = {
  user: AuthUser;
  access_token: string;
  refresh_token?: string;
  provider: 'google' | 'twitter' | 'meta';
  socialAccountToken?: string;
};
