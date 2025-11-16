'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiLoader, FiSmile, FiEdit2, FiInfo } from 'react-icons/fi';
import StepIndicator from '@/components/StepIndicator';
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
        propertyType: workflow.propertyType,
        bedrooms: workflow.bedrooms,
        bathrooms: workflow.bathrooms,
        propertySize: workflow.propertySize,
        parking: workflow.parking,
        view: workflow.view,
        city: workflow.city,
        highlights: workflow.highlights,
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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FiLoader className="text-4xl animate-spin text-blue-600" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <StepIndicator currentStep="caption" />

      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add Caption</h1>
            <p className="text-gray-600">
              Write your own caption or use AI to generate one automatically
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          {/* AI Caption Section */}
          <div className="mb-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <FiSmile />
              </div>
              <h2 className="font-semibold text-gray-900">Generate with AI</h2>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Let our AI analyze your images and create a compelling description
            </p>
            <button
              onClick={generateCaption}
              disabled={isGenerating}
              className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <FiLoader className="animate-spin" /> Analyzing...
                </>
              ) : (
                <>
                  <FiSmile /> Generate Caption
                </>
              )}
            </button>
          </div>

          {/* Caption Input Section */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-8 w-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                <FiEdit2 />
              </div>
              <h2 className="font-semibold text-gray-900">Your Caption</h2>
            </div>

            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <FiInfo className="text-blue-600 font-bold mt-0.5 text-lg shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Write Your Own Caption</p>
                  <p className="text-xs text-blue-700">
                    You can edit the AI-generated caption or write something completely original. Either way works great!
                  </p>
                </div>
              </div>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your caption or paste the AI-generated one..."
              rows={6}
              className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900"
            />
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-gray-500">
                {caption.length} characters • {caption.split('\n').length} lines
              </p>
              {caption.length > 2200 && (
                <p className="text-xs text-orange-600 font-medium">Consider shortening</p>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-gray-200 flex gap-4">
            <button
              onClick={() => router.push('/dashboard/template')}
              disabled={loading}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <FiChevronLeft /> Back
            </button>
            <button
              onClick={handleContinue}
              disabled={loading || !caption.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" /> Processing...
                </>
              ) : (
                'Continue to Publish'
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
