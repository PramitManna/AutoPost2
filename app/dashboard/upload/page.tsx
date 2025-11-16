'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiUpload, FiLoader } from 'react-icons/fi';
import StepIndicator from '@/components/StepIndicator';
import {
  generateSessionId,
  createEmptyWorkflow,
  saveWorkflowSession,
  getWorkflowSession,
  updateWorkflowSession,
} from '@/lib/workflow-session';

export default function UploadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check auth on mount
  useEffect(() => {
    if (connected !== 'true') {
      router.push('/dashboard');
    }

    // Initialize or restore workflow session
    let workflow = getWorkflowSession();
    if (!workflow) {
      const sessionId = generateSessionId();
      workflow = createEmptyWorkflow(sessionId);
      saveWorkflowSession(workflow);
    }
  }, [connected, router]);

  const handleBrowseClick = () => fileInputRef.current?.click();

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setError('Please upload image files only');
      return;
    }

    if (fileArray.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    setUploadedImages(fileArray);
    setImagePreviews(fileArray.map((f) => URL.createObjectURL(f)));
    setError(null);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const fileArray = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (fileArray.length === 0) {
      setError('Please upload image files only');
      return;
    }

    if (fileArray.length > 10) {
      setError('Maximum 10 images allowed');
      return;
    }

    setUploadedImages(fileArray);
    setImagePreviews(fileArray.map((f) => URL.createObjectURL(f)));
    setError(null);
  };

  const processAndUploadImages = async () => {
    if (uploadedImages.length === 0) {
      setError('Please select images first');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('Starting upload...');

    try {
      const urls: string[] = [];
      const publicIds: string[] = [];

      for (let i = 0; i < uploadedImages.length; i++) {
        setProgress(`Uploading image ${i + 1}/${uploadedImages.length}...`);

        const formData = new FormData();
        formData.append('file', uploadedImages[i]);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Upload failed: ${errorData.error}`);
        }

        const data = await response.json();
        urls.push(data.url);
        publicIds.push(data.filename);
      }

      // Save to workflow session and clear old captions/template data
      const workflow = updateWorkflowSession({
        imageUrls: urls,
        imagePublicIds: publicIds,
        originalImageUrls: urls, // Store as original images for AI analysis
        originalImagePublicIds: publicIds,
        previewUrls: urls, // Initialize with original URLs
        caption: '', // Clear old caption
        generatedCaption: '', // Clear old generated caption
        selectedTemplateId: 'none', // Reset template selection
        templateCustomValues: {}, // Reset template custom values
      });

      if (!workflow) {
        throw new Error('Session error');
      }

      setProgress('');
      router.push('/dashboard/listing?connected=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setProgress('');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (uploadedImages.length === 0) {
      setError('Please select images first');
      return;
    }
    await processAndUploadImages();
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <StepIndicator currentStep="upload" />

      <div className="max-w-2xl mx-auto px-4 py-12 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Images</h1>
            <p className="text-gray-600">
              Select up to 10 images to get started. You can apply templates and add captions in the next steps.
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer"
          >
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <FiUpload className="text-3xl" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">Drag & drop your images</p>
                <p className="text-sm text-gray-500 mt-2">or click Browse to select files</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG • Max 10 images • Up to 100MB each</p>
              </div>
              <button
                onClick={handleBrowseClick}
                className="mt-4 px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {uploadedImages.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Selected Images ({uploadedImages.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {uploadedImages.map((file, index) => (
                    <div
                      key={index}
                      className="relative rounded-lg overflow-hidden bg-gray-100 aspect-square"
                    >
                      {imagePreviews[index] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imagePreviews[index]}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      )}
                      <div className="absolute inset-0 bg-black/20 flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <p className="text-white text-sm font-medium">{file.name}</p>
                        <p className="text-white text-xs">{(file.size / 1024 / 1024).toFixed(2)}MB</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {progress && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-3">
                  <FiLoader className="animate-spin text-blue-600" />
                  <span className="text-sm text-blue-800">{progress}</span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
                    setUploadedImages([]);
                    setImagePreviews([]);
                    setError(null);
                  }}
                  className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={handleContinue}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <FiLoader className="animate-spin" /> Processing...
                    </>
                  ) : (
                    `Continue to Template (${uploadedImages.length})`
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
