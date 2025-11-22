'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiLoader, FiEdit2, FiInfo, FiCpu, FiZap } from 'react-icons/fi';
import { motion } from 'framer-motion';
import StepIndicator from '@/components/StepIndicator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { getWorkflowSession, updateWorkflowSession, validateWorkflowStage } from '@/lib/workflow-session';
import type { WorkflowData } from '@/lib/workflow-session';

export default function CaptionPage() {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [caption, setCaption] = useState<string>('');
  const [generatedCaption, setGeneratedCaption] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Validate session and required data
    const validation = validateWorkflowStage('caption');
    if (!validation.valid) {
      router.push('/dashboard/listing?connected=true');
      return;
    }

    const session = getWorkflowSession();
    if (session) {
      setWorkflow(session);
      setCaption(session.caption || '');
      setGeneratedCaption(session.generatedCaption || '');
    }
  }, [router]);

  const generateCaption = async () => {
    if (!workflow || workflow.imageUrls.length === 0) {
      setError('No images available');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setCaption(''); // Clear caption before generating
    setGeneratedCaption(''); // Clear generated caption

    try {
      const formData = new FormData();

      // Fetch images from URLs and convert to blobs
      // Use original images for AI analysis, fallback to current images if no originals
      const analysisUrls = workflow.originalImageUrls && workflow.originalImageUrls.length > 0
        ? workflow.originalImageUrls
        : workflow.imageUrls;

      for (let i = 0; i < analysisUrls.length; i++) {
        const response = await fetch(analysisUrls[i]);
        const blob = await response.blob();
        const file = new File([blob], `image-${i}.jpg`, { type: 'image/jpeg' });
        formData.append(`image${i}`, file);
      }

      // Add listing information to the form
      formData.append('listingInfo', JSON.stringify({
        address: workflow.address,
        propertyType: workflow.propertyType,
        bedrooms: workflow.bedrooms,
        bathrooms: workflow.bathrooms,
        propertySize: workflow.propertySize,
        parking: workflow.parking,
        view: workflow.view,
        zipCode: workflow.zipCode,
        highlights: workflow.highlights,
        agencyName: workflow.agencyName,
        brokerageName: workflow.brokerageName,
      }));

      const response = await fetch('/api/analyseImage', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate caption');
      }

      const data = await response.json();
      setGeneratedCaption(data.description);
      setCaption(data.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate caption');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleContinue = async () => {
    if (!caption || caption.trim().length === 0) {
      setError('Caption is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      updateWorkflowSession({
        caption,
        generatedCaption,
      });

      router.push('/dashboard/publish?connected=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save caption');
    } finally {
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

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <StepIndicator currentStep="caption" />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 tracking-tight">Add Caption</h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Write your own caption or use AI to generate one automatically.
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

          <div className="grid gap-6">
            {/* AI Caption Section */}
            <Card className="p-6 border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/20 dark:to-purple-950/20 overflow-hidden relative group hover:border-indigo-200 dark:hover:border-indigo-800 transition-all duration-300">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity duration-500">
                <FiCpu className="text-9xl text-indigo-600 dark:text-indigo-400 rotate-12 transform" />
              </div>

              <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center">
                    <FiZap className="text-3xl text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-50">Generate with AI</h2>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Powered by advanced image analysis</p>
                  </div>
                </div>

                <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6 max-w-lg leading-relaxed">
                  Let our AI analyze your images and listing details to create a compelling, professional description in seconds.
                </p>

                <Button
                  onClick={generateCaption}
                  disabled={isGenerating}
                  variant="primary"
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 border-transparent shadow-lg shadow-indigo-500/20"
                  isLoading={isGenerating}
                  leftIcon={!isGenerating && <FiCpu />}
                >
                  {isGenerating ? 'Analyzing Images...' : 'Generate Caption'}
                </Button>
              </div>
            </Card>

            {/* Caption Input Section */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                  <FiEdit2 />
                </div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Your Caption</h2>
              </div>

              <div className="relative">
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write your caption or paste the AI-generated one..."
                  rows={8}
                  className="w-full p-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent resize-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-all"
                />
                <div className="absolute bottom-4 right-4 text-xs text-zinc-400 dark:text-zinc-600 font-medium bg-zinc-50 dark:bg-zinc-900 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-800">
                  {caption.length} chars
                </div>
              </div>

              {caption.length > 2200 && (
                <p className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium flex items-center gap-1">
                  <FiInfo /> Consider shortening for better engagement
                </p>
              )}
            </Card>
          </div>

          <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex gap-4 justify-between">
            <Button
              onClick={() => router.push('/dashboard/template')}
              disabled={loading}
              variant="ghost"
              leftIcon={<FiChevronLeft />}
            >
              Back
            </Button>
            <Button
              onClick={handleContinue}
              disabled={loading || !caption.trim()}
              variant="primary"
              size="lg"
              isLoading={loading}
              className="min-w-[150px]"
            >
              Continue
            </Button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
