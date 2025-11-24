'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion } from 'framer-motion';
import { FiZap, FiCheckCircle, FiLoader, FiLogOut, FiArrowRight } from 'react-icons/fi';
import { useState, useEffect } from 'react';

export default function ConnectPage() {
  const router = useRouter();
  const { user, session, signOut, isAuthenticated, userId, hasMetaTokens, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);

  // If not authenticated, redirect to login using useEffect
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-white" />
      </div>
    );
  }

  // Don't render content if not authenticated (redirect will happen)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-white" />
      </div>
    );
  }

  const handleMetaConnect = () => {
    if (!userId) {
      console.error('❌ No user ID available for Meta connection');
      return;
    }
    
    setLoading(true);
    
    // Store userId in cookie so callback can associate tokens with the right user
    document.cookie = `userId=${userId}; path=/; max-age=3600`; // 1 hour expiry
    
    const params = new URLSearchParams({
      client_id: process.env.NEXT_PUBLIC_META_APP_ID!,
      redirect_uri: process.env.NEXT_PUBLIC_META_REDIRECT_URI!,
      scope: [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_posts',
        'instagram_basic',
        'instagram_content_publish'
      ].join(','),
      response_type: 'code',
      state: userId, // Include userId in state for additional verification
    });

    console.log('🚀 Initiating Meta OAuth for user:', userId);
    window.location.href = `${process.env.NEXT_PUBLIC_META_OAUTH_URL}?${params.toString()}`;
  };


  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen gap-4 px-4 py-12 relative overflow-hidden transition-colors duration-300 bg-zinc-50 dark:bg-zinc-950">
      {/* Subtle background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-normal" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-normal" />

      {/* Logout button - top right */}
      <motion.button
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onClick={handleLogout}
        className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium z-20"
      >
        <FiLogOut className="w-4 h-4" />
        Logout
      </motion.button>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        {/* Header Section */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-white mb-6 shadow-2xl shadow-zinc-200/50 dark:shadow-none"
          >
            <FiZap className="text-2xl" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-zinc-900 dark:text-white mb-4 tracking-tight"
          >
            Connect Meta
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed font-light"
          >
            Connect your Meta (Facebook/Instagram) accounts to start posting
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-zinc-600 dark:text-zinc-300 text-sm mt-3 font-medium"
          >
            Logged in as: <span className="font-semibold text-zinc-900 dark:text-white">{user?.email}</span>
          </motion.p>
        </div>

        {/* Features Section */}
        <div className="space-y-4 mb-10">
          {[
            "Multi-platform posting",
            "Secure authentication",
            "One-click account linking"
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + (i * 0.1) }}
              className="flex items-center gap-4 group"
            >
              <div className="h-8 w-8 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center shrink-0 group-hover:border-zinc-400 dark:group-hover:border-zinc-700 transition-colors">
                <FiCheckCircle className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors text-sm" />
              </div>
              <span className="text-zinc-600 dark:text-zinc-300 font-medium group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{feature}</span>
            </motion.div>
          ))}
        </div>

        {/* Meta Connection Status */}
        {hasMetaTokens && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <FiCheckCircle className="text-green-600 dark:text-green-400" />
              <div>
                <p className="text-green-800 dark:text-green-200 font-medium">Meta Accounts Connected</p>
                <p className="text-green-600 dark:text-green-400 text-sm">You can now publish to Facebook and Instagram</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Meta Connection Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mb-4"
        >
          <button
            onClick={hasMetaTokens ? () => router.push('/dashboard') : handleMetaConnect}
            disabled={loading || !userId}
            className={`w-full flex items-center justify-center gap-3 px-6 py-3 ${
              hasMetaTokens 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium`}
          >
            {loading ? (
              <>
                <FiLoader className="animate-spin" />
                Connecting...
              </>
            ) : hasMetaTokens ? (
              <>
                <FiArrowRight className="w-5 h-5" />
                Go to Dashboard
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-2.457 1.429-3.8 3.779-3.8 1.059 0 1.971.078 2.236.112v2.594h-1.537c-1.203 0-1.435.572-1.435 1.41v1.844h2.879l-.375 3.667h-2.504v7.98H9.101Z" />
                </svg>
                Connect Meta Accounts
              </>
            )}
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-xs text-zinc-400 dark:text-zinc-600 font-medium uppercase tracking-widest"
        >
          Your data is secure
        </motion.p>
      </motion.div>
    </main>
  );
}
