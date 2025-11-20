'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiChevronLeft, FiLoader, FiEdit2, FiEye, FiImage, FiCheckCircle, FiInfo, FiZap, FiLayers } from 'react-icons/fi';
import { motion } from 'framer-motion';
import StepIndicator from '@/components/StepIndicator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  getWorkflowSession,
  updateWorkflowSession,
  validateWorkflowStage,
} from '@/lib/workflow-session';

import {
  generateLuxuryPropertyElement,
  renderTemplateToImage,
  uploadToCloudinary,
} from '@/lib/template-html-renderer';

import type { WorkflowData } from '@/lib/workflow-session';
import type { TemplateCustomValues } from '@/lib/template-html-renderer';

export default function TemplatePage() {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [propertyTitle, setPropertyTitle] = useState('LUXURY PROPERTY');
  const [propertyDetails, setPropertyDetails] = useState('A PREMIUM RESIDENCE');
  const [companyName, setCompanyName] = useState('Your Brand');
  const [companyEmail, setCompanyEmail] = useState('hello@reallygreatsite.com');
  const [companyPhone, setCompanyPhone] = useState('+123-456-7890');
  const [companyAddress, setCompanyAddress] = useState(
    '123 Anywhere St, Any City, ST 12345'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageOrder, setImageOrder] = useState<number[]>([]);

  const [previewElement, setPreviewElement] = useState<HTMLElement | null>(null);

  /** Load workflow session + html2canvas */
  useEffect(() => {
    const validation = validateWorkflowStage('template');
    if (!validation.valid) {
      router.push('/dashboard/listing?connected=true');
      return;
    }

    const session = getWorkflowSession();
    if (session) {
      setWorkflow(session);

      // Initialize image order
      setImageOrder(session.imageUrls.map((_, idx) => idx));

      if (session.templateCustomValues) {
        setPropertyTitle(
          session.templateCustomValues.propertyTitle || 'LUXURY PROPERTY'
        );
        setPropertyDetails(
          session.templateCustomValues.propertyDetails || 'A PREMIUM RESIDENCE'
        );
        setCompanyName(
          session.templateCustomValues.companyName || 'Your Brand'
        );
        setCompanyEmail(
          session.templateCustomValues.companyEmail ||
          'hello@reallygreatsite.com'
        );
        setCompanyPhone(
          session.templateCustomValues.companyPhone || '+123-456-7890'
        );
        setCompanyAddress(
          session.templateCustomValues.companyAddress ||
          '123 Anywhere St, Any City, ST 12345'
        );
      }
    }

    const script = document.createElement('script');
    script.src =
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [router]);

  useEffect(() => {
    if (previewElement && previewRef.current) {
      previewRef.current.innerHTML = '';

      previewElement.style.display = 'block';

      previewRef.current.appendChild(previewElement);
    }
  }, [previewElement]);

  const generatePreview = async () => {
    if (!workflow || workflow.imageUrls.length === 0) {
      setError('No images available');
      return;
    }

    setError(null);
    setPreviewLoading(true);

    try {
      const customValues: TemplateCustomValues = {
        propertyTitle,
        propertyDetails,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
      };

      // Generate the template element using selected image
      const element = generateLuxuryPropertyElement(
        workflow.imageUrls[selectedImageIndex],
        customValues
      );

      // Calculate scale to fit 600px container
      const scale = 600 / 1080; // Scale to fit width exactly

      // Apply transform to scale down and position correctly
      element.style.transform = `scale(${scale})`;
      element.style.transformOrigin = 'top left';
      element.style.display = 'block';
      setPreviewElement(element);
      setShowPreview(true);
    } catch (error) {
      console.error(error);
      setError('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ========================================================
  // APPLY TEMPLATE — Only to selected image, then reorder
  // ========================================================
  const handleApplyTemplate = async () => {
    if (!workflow || workflow.imageUrls.length === 0) {
      setError('No images available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const customValues: TemplateCustomValues = {
        propertyTitle,
        propertyDetails,
        companyName,
        companyEmail,
        companyPhone,
        companyAddress,
      };

      // Generate template for ONLY the selected image
      const element = generateLuxuryPropertyElement(
        workflow.imageUrls[selectedImageIndex],
        customValues
      );

      // Position element properly for rendering
      element.style.position = 'fixed';
      element.style.top = '-9999px';
      element.style.left = '-9999px';
      element.style.zIndex = '-1';

      document.body.appendChild(element);

      // Wait a moment for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 100));

      const imageBlob = await renderTemplateToImage(element);
      document.body.removeChild(element);

      // Debug: Check blob size
      console.log('Rendered template blob size:', imageBlob.size, 'bytes');

      const cloud = await uploadToCloudinary(
        imageBlob,
        `property-template-0`
      );

      console.log('Template upload result:', cloud);

      if (!cloud.url) {
        throw new Error('Failed to get URL for templated image');
      }

      // Reorder images according to imageOrder array
      // The templated image will always be first
      const reorderedUrls: string[] = [];
      const reorderedPublicIds: string[] = [];

      // Add templated image first
      reorderedUrls.push(cloud.url);
      reorderedPublicIds.push(cloud.publicId);

      // Add other images in the specified order (excluding the selected one)
      imageOrder.forEach((originalIndex) => {
        if (originalIndex !== selectedImageIndex) {
          reorderedUrls.push(workflow.imageUrls[originalIndex]);
          reorderedPublicIds.push(workflow.imagePublicIds[originalIndex]);
        }
      });

      console.log('Final image order:', reorderedUrls);

      // Preserve original images for AI analysis
      updateWorkflowSession({
        originalImageUrls: workflow.imageUrls, // Store current images as original
        originalImagePublicIds: workflow.imagePublicIds,
        imageUrls: reorderedUrls, // Templated image first, then others in order
        imagePublicIds: reorderedPublicIds,
        selectedTemplateId: 'luxury-property',
        templateCustomValues: customValues as unknown as Record<string, string | undefined>,
      });

      router.push('/dashboard/caption?connected=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  if (!workflow) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-zinc-50" />
      </main>
    );
  }

  // ========================================================
  // UI
  // ========================================================
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <StepIndicator currentStep="template" />

      <div className="max-w-5xl mx-auto px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header with Options */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 tracking-tight">
              Template Options
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Choose to apply a luxury template to enhance your images, or skip directly to caption generation.
            </p>
          </div>

          {/* Template Choice Buttons */}
          <Card className="mb-8 p-6 border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-6 text-center">
              What would you like to do?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Apply Template Option */}
              <Card
                className="p-6 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-50 transition-colors cursor-pointer group"
                onClick={() => document.getElementById('template-section')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div className="text-center">
                  <div className="h-12 w-12 rounded-xl bg-zinc-900 dark:bg-zinc-50 text-zinc-50 dark:text-zinc-900 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                    <FiLayers className="text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Apply Template</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Enhance your images with a professional luxury property template including branding and pricing
                  </p>
                  <Button variant="primary" className="w-full">
                    Customize Template
                  </Button>
                </div>
              </Card>

              {/* Skip Template Option */}
              <Card
                className="p-6 border-2 border-zinc-200 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-zinc-50 transition-colors cursor-pointer group"
                onClick={() => router.push('/dashboard/caption?connected=true')}
              >
                <div className="text-center">
                  <div className="h-12 w-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <FiZap className="text-2xl" />
                  </div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50 mb-2">Skip Template</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
                    Post your images as-is and proceed directly to caption generation and publishing
                  </p>
                  <Button variant="secondary" className="w-full">
                    Skip to Caption
                  </Button>
                </div>
              </Card>
            </div>

            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-6 text-center flex items-center justify-center gap-2">
              <FiInfo />
              You can always come back to apply templates later
            </p>
          </Card>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center"
            >
              {error}
            </motion.div>
          )}

          {/* Template Customization Section */}
          <div id="template-section" className="space-y-6">
            {/* Image Selection & Reordering */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                  <FiImage />
                </div>
                <div>
                  <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Select Image & Reorder</h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Select the main image for the template. Drag or use buttons to reorder.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {imageOrder.map((originalIndex, displayIndex) => (
                  <motion.div
                    key={originalIndex}
                    layoutId={`image-${originalIndex}`}
                    className={`relative group cursor-pointer border-4 rounded-xl overflow-hidden transition-all aspect-square ${selectedImageIndex === originalIndex
                      ? 'border-zinc-900 dark:border-zinc-50 ring-2 ring-zinc-200 dark:ring-zinc-800'
                      : 'border-transparent hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    onClick={() => setSelectedImageIndex(originalIndex)}
                  >
                    <Image
                      src={workflow.imageUrls[originalIndex]}
                      alt={`Image ${displayIndex + 1}`}
                      className="w-full h-full object-cover"
                      width={200}
                      height={200}
                      unoptimized
                    />

                    {/* Selected Badge */}
                    {selectedImageIndex === originalIndex && (
                      <div className="absolute top-2 left-2 bg-zinc-900 dark:bg-zinc-50 text-white dark:text-zinc-900 text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm">
                        <FiCheckCircle /> Template
                      </div>
                    )}

                    {/* Order Number */}
                    <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                      {displayIndex + 1}
                    </div>

                    {/* Reorder Buttons */}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (displayIndex > 0) {
                            const newOrder = [...imageOrder];
                            [newOrder[displayIndex], newOrder[displayIndex - 1]] =
                              [newOrder[displayIndex - 1], newOrder[displayIndex]];
                            setImageOrder(newOrder);
                          }
                        }}
                        disabled={displayIndex === 0}
                        className="flex-1 bg-white/90 text-black text-[10px] py-1 rounded disabled:opacity-30 hover:bg-white font-medium"
                      >
                        Prev
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (displayIndex < imageOrder.length - 1) {
                            const newOrder = [...imageOrder];
                            [newOrder[displayIndex], newOrder[displayIndex + 1]] =
                              [newOrder[displayIndex + 1], newOrder[displayIndex]];
                            setImageOrder(newOrder);
                          }
                        }}
                        disabled={displayIndex === imageOrder.length - 1}
                        className="flex-1 bg-white/90 text-black text-[10px] py-1 rounded disabled:opacity-30 hover:bg-white font-medium"
                      >
                        Next
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Form */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 flex items-center justify-center">
                  <FiEdit2 />
                </div>
                <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Customize Text</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Property Title *"
                  value={propertyTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyTitle(e.target.value)}
                />
                <Input
                  label="Property Details *"
                  value={propertyDetails}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPropertyDetails(e.target.value)}
                />
                <Input
                  label="Company Name"
                  value={companyName}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value)}
                />
                <Input
                  label="Email"
                  value={companyEmail}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyEmail(e.target.value)}
                />
                <Input
                  label="Phone"
                  value={companyPhone}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyPhone(e.target.value)}
                />
                <Input
                  label="Address"
                  value={companyAddress}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCompanyAddress(e.target.value)}
                />
              </div>

              <div className="mt-8">
                <Button
                  onClick={generatePreview}
                  disabled={previewLoading}
                  variant="primary"
                  className="w-full shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5"
                  isLoading={previewLoading}
                  leftIcon={!previewLoading && <FiEye />}
                >
                  {previewLoading ? 'Generating Preview...' : 'Preview Template'}
                </Button>
              </div>
            </Card>

            {/* Preview */}
            {showPreview && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8"
              >
                <h2 className="text-lg font-semibold text-center text-zinc-900 dark:text-zinc-50 mb-6 flex items-center gap-2 justify-center">
                  <FiEye className="text-green-500" />
                  Preview
                </h2>

                <div className="flex justify-center">
                  <div
                    ref={previewRef}
                    className="shadow-2xl rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800"
                    style={{
                      width: '600px',
                      height: '600px',
                      backgroundColor: 'white',
                      position: 'relative',
                    }}
                  />
                </div>

                <p className="text-center text-xs text-zinc-500 dark:text-zinc-400 mt-6">
                  This is how your images will look with the template applied
                </p>
              </motion.div>
            )}
          </div>

          {/* Buttons */}
          <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex gap-4 justify-between">
            <Button
              onClick={() => router.push('/dashboard/listing')}
              variant="ghost"
              leftIcon={<FiChevronLeft />}
            >
              Back
            </Button>

            <Button
              onClick={handleApplyTemplate}
              disabled={!showPreview || loading}
              variant="primary"
              size="lg"
              isLoading={loading}
              className="min-w-[200px]"
            >
              Apply & Continue
            </Button>
          </div>
        </motion.div>
      </div>
    </main>
  );
}
