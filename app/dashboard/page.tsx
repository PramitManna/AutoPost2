'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiLoader, FiZap, FiCheckCircle } from 'react-icons/fi';

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
      <div className="min-h-screen bg-linear-to-b from-blue-50 via-white to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8 text-center">
            <div className="mb-6 flex flex-col items-center">
              <div className="h-16 w-16 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white mb-4">
                <FiZap className="text-2xl" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to AutoPost!</h1>
              <p className="text-gray-600">Connect your Facebook and Instagram accounts to start sharing content automatically.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="text-left space-y-2">
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="text-green-600 font-bold mt-1 shrink-0" />
                  <span className="text-sm text-gray-700">AI-powered captions</span>
                </div>
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="text-green-600 font-bold mt-1 shrink-0" />
                  <span className="text-sm text-gray-700">Professional templates</span>
                </div>
                <div className="flex items-start gap-3">
                  <FiCheckCircle className="text-green-600 font-bold mt-1 shrink-0" />
                  <span className="text-sm text-gray-700">Multi-platform posting</span>
                </div>
              </div>
            </div>

            <a
              href={`${process.env.NEXT_PUBLIC_META_OAUTH_URL}?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_META_REDIRECT_URI || '')}&scope=pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code`}
              className="block w-full px-4 py-3 font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm hover:shadow transition-all mb-3"
            >
              Connect Meta Accounts
            </a>

            <p className="text-xs text-gray-500">Secure connection • No spam • Cancel anytime</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <FiLoader className="text-4xl animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">Redirecting to upload...</p>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardPageContent />
    </Suspense>
  );
}
