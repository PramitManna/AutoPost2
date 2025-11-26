'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiLoader, FiZap, FiCheckCircle, FiLogOut } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { UserNavbar } from '@/components/UserNavbar';
import { useAuth } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { ConnectionStatus } from '@/components/ConnectionStatus';

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  const { user, session, signOut, isAuthenticated, loading, userId, hasMetaTokens } = useAuth();

  useEffect(() => {

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

  // Show error if no pages found
  if (error === 'no_page') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300 mt-20">
        <UserNavbar showCancelUpload={false} />
        {/* Subtle background gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-normal" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-normal" />

        {/* Logout button - fixed position below navbar */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handleLogout}
          className="fixed top-20 right-6 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium z-50"
        >
          <FiLogOut />
          Logout
        </motion.button>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md relative z-10"
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 mb-6"
            >
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-3xl font-bold text-zinc-900 dark:text-white mb-3 tracking-tight"
            >
              No Facebook Pages Found
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-zinc-600 dark:text-zinc-400 text-base"
            >
              {message || "We couldn't find any Facebook pages associated with your account."}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg"
          >
            <h3 className="text-blue-900 dark:text-blue-200 font-semibold mb-2">What's Next?</h3>
            <ul className="text-blue-800 dark:text-blue-300 text-sm space-y-2">
              <li>• You need to be an admin of a Facebook page</li>
              <li>• Create a new page if you don't have one</li>
              <li>• Or ensure your account has admin access to an existing page</li>
            </ul>
          </motion.div>

          <div className="space-y-3">
            <motion.a
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              href="https://www.facebook.com/pages/create/?ref=autopost"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-center transition-colors shadow-lg shadow-blue-600/20"
            >
              Create a Facebook Page
            </motion.a>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              onClick={() => router.push('/connect')}
              className="w-full py-3 px-4 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-lg font-semibold text-center transition-colors"
            >
              Try Again
            </motion.button>

            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 px-4 bg-transparent border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-900 dark:text-white rounded-lg font-semibold text-center transition-colors"
            >
              Go to Dashboard
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (connected !== 'true') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300 mt-20">
        <UserNavbar showCancelUpload={false} />
        {/* Subtle background gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-normal" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-normal" />

        {/* Logout button - fixed position below navbar */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={handleLogout}
          className="fixed top-20 right-6 flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium z-50"
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
            {userId && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="text-zinc-400 dark:text-zinc-500 text-xs mt-1"
              >
                User ID: {userId}
              </motion.p>
            )}
          </div>

          {/* Meta Connection Status */}
          {hasMetaTokens && userId ? (
            <ConnectionStatus userId={userId} />
          ) : hasMetaTokens ? (
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
                  <p className="text-green-600 dark:text-green-400 text-sm">Ready to publish to Facebook & Instagram</p>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <FiZap className="text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="text-yellow-800 dark:text-yellow-200 font-medium">Connect Meta Accounts</p>
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm">Link Facebook & Instagram to start posting</p>
                </div>
              </div>
            </motion.div>
          )}

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
                transition={{ delay: 0.6 + (i * 0.1) }}
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
              href={hasMetaTokens ? "/dashboard/upload?connected=true" : "/connect"}
              variant="primary"
              size="lg"
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 border-transparent h-14 text-base font-semibold shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {hasMetaTokens ? "Start Creating Posts" : "Connect Meta Accounts"}
            </Button>

            <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600 font-medium uppercase tracking-widest">
              {hasMetaTokens ? "Ready to Post" : "Connect to Continue"}
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
            
            {/* Privacy & Data Link */}
            <div className="mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-700">
              <Button
                href="/dashboard/privacy"
                variant="outline"
                size="sm"
                className="w-full text-xs"
              >
                Privacy & Data Settings
              </Button>
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
