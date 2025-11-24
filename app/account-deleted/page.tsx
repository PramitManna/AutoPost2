'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiCheckCircle, FiArrowRight, FiShield, FiTrash2 } from 'react-icons/fi';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function AccountDeletedPage() {
  const router = useRouter();

  useEffect(() => {
    // Clear any remaining authentication state
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Background gradients */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 text-center">
          {/* Success Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 mb-6 mx-auto"
          >
            <FiCheckCircle className="text-3xl" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-zinc-900 dark:text-white mb-3"
          >
            Account Deleted Successfully
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed"
          >
            Your AutoPost account and all associated data have been permanently deleted in accordance with our privacy policy and GDPR requirements.
          </motion.p>

          {/* What was deleted */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center gap-2 mb-3">
              <FiTrash2 className="text-zinc-600 dark:text-zinc-400" />
              <span className="font-medium text-zinc-900 dark:text-white">Data Removed</span>
            </div>
            
            <ul className="text-left text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
              <li>✓ Profile and account information</li>
              <li>✓ Social media connections and tokens</li>
              <li>✓ Uploaded images and content</li>
              <li>✓ Post history and analytics</li>
              <li>✓ Session data and preferences</li>
            </ul>
          </motion.div>

          {/* Privacy Notice */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <FiShield className="text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-800 dark:text-blue-200">Privacy Compliance</span>
            </div>
            
            <p className="text-sm text-blue-700 dark:text-blue-300">
              This deletion complies with GDPR Article 17 (Right to Erasure) and CCPA data protection requirements. 
              An audit log of this deletion has been created for compliance purposes.
            </p>
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="space-y-3"
          >
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
            >
              <FiArrowRight className="mr-2" />
              Return to Homepage
            </Button>
            
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Thank you for using AutoPost. If you have any questions about your data deletion, 
              please contact our privacy officer at privacy@autopost.app
            </p>
          </motion.div>
        </Card>
      </motion.div>
    </div>
  );
}