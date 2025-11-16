'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiChevronLeft, FiLoader, FiImage } from 'react-icons/fi';
import Image from 'next/image';
import StepIndicator from '@/components/StepIndicator';
import { getWorkflowSession, validateWorkflowStage, clearWorkflowSession } from '@/lib/workflow-session';
import { SiFacebook, SiInstagram } from 'react-icons/si';
import type { WorkflowData } from '@/lib/workflow-session';

export default function PublishPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');

  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (connected !== 'true') {
      router.push('/dashboard');
      return;
    }

    // Validate session and required data
    const validation = validateWorkflowStage('publish');
    if (!validation.valid) {
      router.push('/dashboard/upload');
      return;
    }

    const session = getWorkflowSession();
    if (session) {
      console.log('Workflow session:', {
        imageUrls: session.imageUrls,
        originalImageUrls: session.originalImageUrls,
        imagePublicIds: session.imagePublicIds
      });
      setWorkflow(session);
    }
  }, [router, connected]);

  const cleanupImages = async (publicIds: string[]) => {
    for (const publicId of publicIds) {
      try {
        await fetch(`/api/upload/delete?publicId=${encodeURIComponent(publicId)}`, {
          method: 'DELETE',
        });
      } catch {
        console.warn('Cleanup failed for', publicId);
      }
    }
  };

  const postToFacebook = async () => {
    if (!workflow) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = workflow.imageUrls.length === 1
        ? '/api/social/publish-facebook'
        : '/api/social/publish-facebook-multiple';

      const body = workflow.imageUrls.length === 1
        ? { imageUrl: workflow.imageUrls[0], caption: workflow.caption }
        : { imageUrls: workflow.imageUrls, caption: workflow.caption };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post to Facebook');
      }

      setSuccess('✅ Posted to Facebook successfully!');
      await cleanupImages(workflow.imagePublicIds);
      clearWorkflowSession();
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post to Facebook');
      setLoading(false);
    }
  };

  const postToInstagram = async () => {
    if (!workflow) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const endpoint = workflow.imageUrls.length === 1
        ? '/api/social/publish-instagram'
        : '/api/social/publish-instagram-multiple';

      const body = workflow.imageUrls.length === 1
        ? { imageUrl: workflow.imageUrls[0], caption: workflow.caption }
        : { imageUrls: workflow.imageUrls, caption: workflow.caption };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to post to Instagram');
      }

      setSuccess('✅ Posted to Instagram successfully!');
      await cleanupImages(workflow.imagePublicIds);
      clearWorkflowSession();
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post to Instagram');
      setLoading(false);
    }
  };

  if (!workflow) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FiLoader className="text-4xl animate-spin text-blue-600" />
      </main>
    );
  }

  const postType = workflow.imageUrls.length > 1 ? 'multiple' : 'single';

  return (
    <main className="min-h-screen bg-gray-50">
      <StepIndicator currentStep="publish" />

      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Review & Publish</h1>
            <p className="text-gray-600">
              Preview your post and choose where to publish
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
              {success}
            </div>
          )}

          {/* Preview Section */}
          <div className="mb-8 p-6 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex items-center gap-3 mb-4">
              <FiImage className="text-lg text-blue-600" />
              <h2 className="font-semibold text-gray-900">Post Preview</h2>
            </div>

            <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Caption:</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {workflow.caption}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-600">Images ({workflow.imageUrls.length}):</p>
                {workflow.imageUrls.length === 1 ? (
                  workflow.imageUrls[0] ? (
                    <div className="space-y-2">
                      {/* Try both Image component and raw img as fallback */}
                      <Image
                        src={workflow.imageUrls[0]}
                        alt="Preview"
                        className="w-full rounded-lg"
                        width={1080}
                        height={1080}
                        unoptimized
                        onError={(e) => {
                          console.error('Next.js Image failed to load:', workflow.imageUrls[0]);
                          // Hide the Image component and show raw img
                          e.currentTarget.style.display = 'none';
                          const fallbackImg = e.currentTarget.parentElement?.querySelector('img.fallback-img') as HTMLImageElement;
                          if (fallbackImg) {
                            fallbackImg.style.display = 'block';
                          }
                        }}
                        onLoad={() => console.log('Next.js Image loaded successfully:', workflow.imageUrls[0])}
                      />
                      {/* Fallback raw img element */}
                      <img 
                        className="fallback-img w-full rounded-lg" 
                        style={{display: 'none'}} 
                        src={workflow.imageUrls[0]} 
                        alt="Preview fallback"
                        onLoad={() => console.log('Fallback img loaded successfully:', workflow.imageUrls[0])}
                        onError={() => console.error('Fallback img also failed:', workflow.imageUrls[0])}
                      />
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs break-all">
                        <strong>URL:</strong> {workflow.imageUrls[0]}
                      </div>
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                        <strong>Test:</strong> <a href={workflow.imageUrls[0]} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Open image in new tab</a>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">No image available</p>
                    </div>
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {workflow.imageUrls.slice(0, 4).map((url, idx) => (
                      <div key={idx} className="relative rounded-lg overflow-hidden">
                        {url ? (
                          <Image
                            src={url}
                            alt={`Image ${idx + 1}`}
                            width={400}
                            height={400}
                            className="w-full h-32 object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-32 bg-gray-200 flex items-center justify-center">
                            <p className="text-gray-500 text-xs">No image</p>
                          </div>
                        )}
                        {idx === 3 && workflow.imageUrls.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <span className="text-white text-lg font-bold">
                              +{workflow.imageUrls.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Publishing Options */}
          {!success && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              <button
                onClick={postToFacebook}
                disabled={loading}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <SiFacebook className="text-2xl text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Facebook</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Post {postType === 'single' ? 'image' : 'carousel'} to your page
                </p>
                <span className="inline-block px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300">
                  {loading ? 'Publishing...' : 'Post to Facebook'}
                </span>
              </button>

              <button
                onClick={postToInstagram}
                disabled={loading}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-pink-600 hover:bg-pink-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                <div className="flex items-center gap-3 mb-3">
                  <SiInstagram className="text-2xl text-pink-600" />
                  <h3 className="font-semibold text-gray-900">Instagram</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Post {postType === 'single' ? 'image' : 'carousel'} to your feed
                </p>
                <span className="inline-block px-4 py-2 bg-pink-600 text-white text-sm font-medium rounded-lg hover:bg-pink-700 disabled:bg-gray-300">
                  {loading ? 'Publishing...' : 'Post to Instagram'}
                </span>
              </button>
            </div>
          )}          <div className="pt-8 border-t border-gray-200 flex gap-4">
            {success ? (
              <>
                <button
                  onClick={() => router.push('/dashboard/upload?connected=true')}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create New Post
                </button>
              </>
            ) : (
              <button
                onClick={() => router.push('/dashboard/caption')}
                disabled={loading}
                className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <FiChevronLeft /> Back
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
