'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiLoader, FiZap, FiCheckCircle, FiLogOut } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const { user, session, signOut, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    // If connected, redirect to upload workflow
    if (connected === 'true') {
      router.push('/dashboard/upload?connected=true');
    }
  }, [connected, router]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-12">
        <div className="text-center">
          <FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-white mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (connected !== 'true') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
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
          <FiLogOut />
          Logout
        </motion.button>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm relative z-10"
        >
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
              AutoPost
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed font-light"
            >
              Welcome, {user?.user_metadata?.name || user?.email}!
            </motion.p>
            {session?.provider && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45 }}
                className="text-zinc-400 dark:text-zinc-500 text-sm mt-2"
              >
                Authenticated via: <span className="capitalize font-semibold text-zinc-600 dark:text-zinc-300">{session.provider}</span>
              </motion.p>
            )}
          </div>

          <div className="space-y-6 mb-10">
            {[
              "AI caption generation",
              "Premium design templates",
              "One-click multi-posting"
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Button
              href="/dashboard/upload"
              variant="primary"
              size="lg"
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 border-transparent h-14 text-base font-semibold shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Start Creating Posts
            </Button>

            <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600 font-medium uppercase tracking-widest">
              Ready to Post
            </p>
          </motion.div>

          {/* User Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-10 p-4 bg-zinc-100 dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800"
          >
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-3">Account Information</h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-zinc-600 dark:text-zinc-400">Email:</span>
                <span className="text-zinc-900 dark:text-white ml-2">{user?.email}</span>
              </p>
              <p>
                <span className="text-zinc-600 dark:text-zinc-400">Auth Provider:</span>
                <span className="text-zinc-900 dark:text-white ml-2 capitalize">{session?.provider}</span>
              </p>
              {session?.socialAccountToken && (
                <p>
                  <span className="text-zinc-600 dark:text-zinc-400">Social Token:</span>
                  <span className="text-zinc-900 dark:text-white ml-2 truncate text-xs">
                    {session.socialAccountToken.substring(0, 20)}...
                  </span>
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="text-center">
        <FiLoader className="text-4xl animate-spin text-white mx-auto mb-4" />
        <p className="text-zinc-500 font-medium">Redirecting...</p>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><FiLoader className="text-white text-3xl animate-spin" /></div>}>
        <DashboardPageContent />
      </Suspense>
    </ProtectedRoute>
  );
}
