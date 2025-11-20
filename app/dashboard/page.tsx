'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiLoader, FiZap, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';

function DashboardPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');

  useEffect(() => {
    // If connected, redirect to upload workflow
    if (connected === 'true') {
      router.push('/dashboard/upload?connected=true');
    }
  }, [connected, router]);

  if (connected !== 'true') {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-12 relative overflow-hidden transition-colors duration-300">
        {/* Subtle background gradients */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-normal" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none mix-blend-multiply dark:mix-blend-normal" />

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
              Your AI-powered social media suite.
            </motion.p>
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
              href={`${process.env.NEXT_PUBLIC_META_OAUTH_URL}?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_META_REDIRECT_URI || '')}&scope=pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code`}
              variant="primary"
              size="lg"
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200 border-transparent h-14 text-base font-semibold shadow-xl shadow-zinc-900/10 dark:shadow-white/5"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Connect Meta Accounts
            </Button>

            <p className="mt-6 text-center text-xs text-zinc-400 dark:text-zinc-600 font-medium uppercase tracking-widest">
              Secure Connection
            </p>
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
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><FiLoader className="text-white text-3xl animate-spin" /></div>}>
      <DashboardPageContent />
    </Suspense>
  );
}
