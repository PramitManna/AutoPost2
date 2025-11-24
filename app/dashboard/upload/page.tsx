'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiUpload, FiLoader } from 'react-icons/fi';
import { motion } from 'framer-motion';
import StepIndicator from '@/components/StepIndicator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { UserNavbar } from '@/components/UserNavbar';
import { useAuth } from '@/context/AuthContext';
import { cancelUploadWorkflow } from '@/lib/cancel-workflow';
import {
  generateSessionId,
  createEmptyWorkflow,
  saveWorkflowSession,
  getWorkflowSession,
  updateWorkflowSession,
} from '@/lib/workflow-session';

function UploadPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const connected = searchParams.get('connected');
  const { isAuthenticated, hasMetaTokens, loading: authLoading } = useAuth();

  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);


  useEffect(() => {

    if (authLoading) return;
    

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    

    if (!hasMetaTokens && connected !== 'true') {
      router.push('/dashboard');
      return;
    }


    let workflow = getWorkflowSession();
    if (!workflow) {
      const sessionId = generateSessionId();
      workflow = createEmptyWorkflow(sessionId);
      saveWorkflowSession(workflow);
    }
  }, [authLoading, isAuthenticated, hasMetaTokens, connected, router]);


  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-white mx-auto mb-4" />
          <p className="text-zinc-600 dark:text-zinc-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

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

  const handleCancelUpload = async () => {
    if (confirm('Are you sure you want to cancel this upload? All progress will be lost and uploaded images will be deleted.')) {
      try {
        await cancelUploadWorkflow();
        router.push('/dashboard');
      } catch (error) {
        console.error('Error canceling upload:', error);
        router.push('/dashboard');
      }
    }
  };

  return (
    <>
      <UserNavbar 
        onCancelUpload={handleCancelUpload}
        showCancelUpload={true}
      />
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20 mt-[60px]">
        <StepIndicator currentStep="upload" />
        <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 tracking-tight">Upload Images</h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Select up to 10 images to get started. We&apos;ll help you create stunning posts in seconds.
            </p>
          </div>

          <Card className="p-8 border-dashed border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors cursor-pointer bg-zinc-50/50 dark:bg-zinc-900/50"
            onClick={handleBrowseClick}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-900 dark:text-zinc-50 mb-2">
                <FiUpload className="text-3xl" />
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Upload or capture photos</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">tap to select from device or take photos directly</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-4 font-medium uppercase tracking-wider">JPG, PNG • Max 10 images</p>
              </div>
              <Button
                variant="secondary"
                className="mt-4"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleBrowseClick();
                }}
              >
                Browse Files
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </Card>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center"
            >
              {error}
            </motion.div>
          )}

          {uploadedImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-12"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Selected Images ({uploadedImages.length})
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    imagePreviews.forEach((url) => URL.revokeObjectURL(url));
                    setUploadedImages([]);
                    setImagePreviews([]);
                    setError(null);
                  }}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Clear All
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
                {uploadedImages.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 aspect-square group shadow-sm border border-zinc-200 dark:border-zinc-700"
                  >
                    {imagePreviews[index] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imagePreviews[index]}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 text-center">
                      <p className="text-white text-xs font-medium truncate w-full px-2">{file.name}</p>
                      <p className="text-white/80 text-[10px] mt-1">{(file.size / 1024 / 1024).toFixed(2)}MB</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {progress && (
                <div className="mb-8 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center gap-3 justify-center">
                  <FiLoader className="animate-spin text-zinc-900 dark:text-zinc-50" />
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{progress}</span>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  onClick={handleContinue}
                  disabled={loading}
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto min-w-[200px]"
                  isLoading={loading}
                  rightIcon={!loading && <FiUpload />}
                >
                  {loading ? 'Processing...' : `Continue (${uploadedImages.length})`}
                </Button>
              </div>
            </motion.div>
          )}
        </motion.div>
        </main>
      </div>
    </>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <UploadPageContent />
    </Suspense>
  );
}
