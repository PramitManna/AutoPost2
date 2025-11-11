'use client';

import { useSearchParams } from 'next/navigation';
import { useState } from 'react';

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const error = searchParams.get('error');
  const message = searchParams.get('message');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [postType, setPostType] = useState<'single' | 'multiple'>('single');

  // Get connection data from URL params (from callback)
  const accessToken = searchParams.get('accessToken');
  const pageId = searchParams.get('pageId'); 
  const userName = searchParams.get('userName');
  const igBusinessId = searchParams.get('igBusinessId');

  const postToFacebook = async () => {
    if (!pageId || !accessToken) {
      setResult("❌ Missing connection data");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/social/publish-facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: "https://cdn.pixabay.com/photo/2025/11/05/20/57/monastery-9939590_1280.jpg",
          caption: "🏡 Automated post from AutoPost!",
          pageId,
          accessToken,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        const link = `https://facebook.com/${data.postId.replace("_", "/posts/")}`;
        setResult(link);
      } else {
        setResult("❌ Failed to publish: " + JSON.stringify(data.error));
      }
    } catch (err) {
      setResult("❌ Network error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const postMultipleToFacebook = async () => {
    if (!pageId || !accessToken) {
      setResult("❌ Missing connection data");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/social/publish-facebook-multiple", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: [
            "https://cdn.pixabay.com/photo/2025/11/05/20/57/monastery-9939590_1280.jpg",
            "https://cdn.pixabay.com/photo/2024/05/26/10/15/bird-8788491_1280.jpg",
            "https://images.pexels.com/photos/1323550/pexels-photo-1323550.jpeg"
          ],
          caption: "🏡 Multiple images automated post from AutoPost! 📸✨",
          pageId,
          accessToken,
        }),
      });

      const data = await res.json();
      
      if (data.success) {
        const link = `https://facebook.com/${data.postId.replace("_", "/posts/")}`;
        setResult(link);
      } else {
        setResult("❌ Failed to publish: " + JSON.stringify(data.error));
      }
    } catch (err) {
      setResult("❌ Network error: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (connected === 'true') {
    return (
      <main className="flex flex-col items-center justify-center h-screen space-y-4">
        <h1 className="text-3xl font-semibold">Connected ✅</h1>
        <p className="text-lg">
          Welcome {userName}! Your accounts are successfully linked!
        </p>
        
        <div className="bg-gray-100 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Connection Details:</h3>
          <p className="text-sm text-gray-600">Facebook Page ID: {pageId}</p>
          {igBusinessId && <p className="text-sm text-gray-600">Instagram Business ID: {igBusinessId}</p>}
        </div>

        <div className="flex flex-col space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setPostType('single')}
              className={`px-4 py-2 text-sm rounded-lg border ${
                postType === 'single' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Single Image
            </button>
            <button
              onClick={() => setPostType('multiple')}
              className={`px-4 py-2 text-sm rounded-lg border ${
                postType === 'multiple' 
                  ? 'bg-blue-600 text-white border-blue-600' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              Multiple Images
            </button>
          </div>

          {postType === 'single' ? (
            <button
              onClick={postToFacebook}
              disabled={loading || !pageId || !accessToken}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? "Posting..." : "Post Single Image"}
            </button>
          ) : (
            <button
              onClick={postMultipleToFacebook}
              disabled={loading || !pageId || !accessToken}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {loading ? "Posting..." : "Post Multiple Images"}
            </button>
          )}
        </div>

        {result && (
          <div className="text-center text-sm mt-4 max-w-md">
            {result.startsWith("http") ? (
              <a
                href={result}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                ✅ View Post on Facebook
              </a>
            ) : (
              <span className="text-red-500 break-all">{result}</span>
            )}
          </div>
        )}
      </main>
    );
  }

  if (error === 'no_page') {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
              </svg>
            </div>
            <h3 className="mt-2 text-lg font-medium text-gray-900">Facebook Page Required</h3>
            <p className="mt-1 text-sm text-gray-500 mb-4">
              {message}
            </p>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 text-left">
              <h4 className="font-medium text-blue-900 mb-2">How to create a Facebook Page:</h4>
              <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                <li>Go to <a href="https://www.facebook.com/pages/create" target="_blank" rel="noopener noreferrer" className="underline">facebook.com/pages/create</a></li>
                <li>Choose &quot;Business or Brand&quot;</li>
                <li>Enter your page name and category</li>
                <li>Complete the setup process</li>
                <li>Come back and connect again</li>
              </ol>
            </div>
            
            <div className="mt-6 space-y-3">
              <a
                href="https://www.facebook.com/pages/create"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create Facebook Page
              </a>
              <div>
                <a
                  href="/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again After Creating Page
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900">Welcome!</h3>
          <p className="mt-1 text-sm text-gray-500">
            Connect your Facebook and Instagram accounts to start posting.
          </p>
          
          <div className="mt-6">
            <a
              href={`${process.env.NEXT_PUBLIC_META_OAUTH_URL}?client_id=${process.env.NEXT_PUBLIC_META_APP_ID}&redirect_uri=${encodeURIComponent(process.env.NEXT_PUBLIC_META_REDIRECT_URI || '')}&scope=pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish&response_type=code`}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Connect Meta Accounts
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
