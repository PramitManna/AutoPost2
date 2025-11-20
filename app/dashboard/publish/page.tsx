'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiChevronLeft, FiLoader, FiImage, FiHeart, FiMessageCircle, FiSend, FiBookmark, FiMoreHorizontal, FiCheckCircle } from 'react-icons/fi';
import Image from 'next/image';
import { motion } from 'framer-motion';
import StepIndicator from '@/components/StepIndicator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getWorkflowSession, validateWorkflowStage, clearWorkflowSession } from '@/lib/workflow-session';
import { SiFacebook, SiInstagram } from 'react-icons/si';
import type { WorkflowData } from '@/lib/workflow-session';

function PublishPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');

  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [postUrl, setPostUrl] = useState<string | null>(null);

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
    setPostUrl(null);

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

      setSuccess('Posted to Facebook successfully!');
      setPostUrl(data.postUrl || null);
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
    setPostUrl(null);

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

      setSuccess('Posted to Instagram successfully!');
      setPostUrl('https://www.instagram.com/'); // Instagram doesn't provide direct post URLs
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
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-zinc-50" />
      </main>
    );
  }

  const postType = workflow.imageUrls.length > 1 ? 'multiple' : 'single';

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <StepIndicator currentStep="publish" />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 tracking-tight">Review & Publish</h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Preview your post and choose where to publish.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center"
            >
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl"
            >
              <div className="flex items-center gap-3 text-green-600 dark:text-green-400">
                <FiCheckCircle className="text-xl flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{success}</p>
                  {postUrl && (
                    <a
                      href={postUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-700 dark:text-green-300 hover:underline mt-1 inline-block"
                    >
                      View your post →
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Preview Section */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
                {/* Mac Window Header */}
                <div className="bg-zinc-100 dark:bg-zinc-900 px-4 py-3 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="w-3 h-3 rounded-full bg-red-500 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
                  <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
                  <div className="ml-4 text-xs text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-2">
                    Post Preview
                  </div>
                </div>

                {/* Generic Post Content */}
                <div className="bg-white dark:bg-black">
                  {/* Post Header */}
                  <div className="flex items-center justify-between p-3 border-b border-zinc-100 dark:border-zinc-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-400 to-purple-600 p-[2px]">
                        <div className="w-full h-full rounded-full bg-white dark:bg-black border-2 border-white dark:border-black overflow-hidden relative flex items-center justify-center">
                          <div className="w-full h-full bg-zinc-200 dark:bg-zinc-800" />
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">Your Brand</span>
                    </div>
                    <FiMoreHorizontal className="text-zinc-900 dark:text-white text-xl" />
                  </div>

                  {/* Post Image Grid */}
                  <div className="relative aspect-square w-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                    {workflow.imageUrls.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <p className="text-zinc-400 text-sm">No image available</p>
                      </div>
                    ) : workflow.imageUrls.length === 1 ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={workflow.imageUrls[0]}
                          alt="Preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : workflow.imageUrls.length === 2 ? (
                      <div className="grid grid-cols-2 h-full w-full gap-0.5 bg-zinc-200 dark:bg-zinc-800">
                        {workflow.imageUrls.map((url, idx) => (
                          <div key={idx} className="relative h-full w-full bg-white dark:bg-zinc-900">
                            <Image
                              src={url}
                              alt={`Preview ${idx + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ))}
                      </div>
                    ) : workflow.imageUrls.length === 3 ? (
                      <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-0.5 bg-zinc-200 dark:bg-zinc-800">
                        <div className="relative row-span-2 h-full w-full bg-white dark:bg-zinc-900">
                          <Image
                            src={workflow.imageUrls[0]}
                            alt="Preview 1"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="relative h-full w-full bg-white dark:bg-zinc-900">
                          <Image
                            src={workflow.imageUrls[1]}
                            alt="Preview 2"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="relative h-full w-full bg-white dark:bg-zinc-900">
                          <Image
                            src={workflow.imageUrls[2]}
                            alt="Preview 3"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 grid-rows-2 h-full w-full gap-0.5 bg-zinc-200 dark:bg-zinc-800">
                        {workflow.imageUrls.slice(0, 4).map((url, idx) => (
                          <div key={idx} className="relative h-full w-full bg-white dark:bg-zinc-900">
                            <Image
                              src={url}
                              alt={`Preview ${idx + 1}`}
                              fill
                              className="object-cover"
                              unoptimized
                            />
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

                  {/* Post Actions */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <FiHeart className="text-2xl text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors" />
                        <FiMessageCircle className="text-2xl text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors" />
                        <FiSend className="text-2xl text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors" />
                      </div>
                      <FiBookmark className="text-2xl text-zinc-900 dark:text-white hover:text-zinc-600 dark:hover:text-zinc-300 cursor-pointer transition-colors" />
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-white">1,234 likes</p>
                      <div className="text-sm text-zinc-900 dark:text-white">
                        <span className="font-semibold mr-2">Your Brand</span>
                        <span className="font-light whitespace-pre-wrap">{workflow.caption}</span>
                      </div>
                      <p className="text-xs text-zinc-500 uppercase mt-2">2 hours ago</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Publishing Options */}
            <div className="lg:col-span-1 space-y-6">
              {!success ? (
                <>
                  <Card
                    className="p-6 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-colors group"
                    onClick={postToFacebook}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <SiFacebook className="text-2xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Facebook</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Post to your page</p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white border-transparent"
                      isLoading={loading}
                      disabled={loading}
                    >
                      {loading ? 'Publishing...' : 'Post Now'}
                    </Button>
                  </Card>

                  <Card
                    className="p-6 cursor-pointer hover:border-pink-500 dark:hover:border-pink-500 transition-colors group"
                    onClick={postToInstagram}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="h-12 w-12 rounded-full bg-pink-50 dark:bg-pink-900/20 text-pink-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <SiInstagram className="text-2xl" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Instagram</h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">Post to your feed</p>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-transparent"
                      isLoading={loading}
                      disabled={loading}
                    >
                      {loading ? 'Publishing...' : 'Post Now'}
                    </Button>
                  </Card>
                </>
              ) : (
                <Card className="p-6 text-center">
                  <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 mx-auto mb-4 flex items-center justify-center">
                    <FiImage className="text-3xl" />
                  </div>
                  <h3 className="font-bold text-zinc-900 dark:text-zinc-50 mb-2">Post Published!</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Your content is now live.
                  </p>
                  <Button
                    onClick={() => router.push('/dashboard/upload?connected=true')}
                    variant="primary"
                    className="w-full"
                  >
                    Create New Post
                  </Button>
                </Card>
              )}

              {!success && (
                <Button
                  onClick={() => router.push('/dashboard/caption')}
                  disabled={loading}
                  variant="ghost"
                  className="w-full"
                  leftIcon={<FiChevronLeft />}
                >
                  Back to Caption
                </Button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </main>
  );
}

export default function PublishPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950"><FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-zinc-50" /></div>}>
      <PublishPageContent />
    </Suspense>
  );
}
