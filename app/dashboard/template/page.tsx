'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { FiChevronLeft, FiLoader, FiEdit2, FiEye, FiImage, FiCheckCircle, FiInfo, FiZap, FiLayers } from 'react-icons/fi';
import StepIndicator from '@/components/StepIndicator';
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
      const scale = 700 / 1080; // ~0.648

      // Apply transform to scale down and position correctly
      element.style.transform = `scale(${scale})`;
      element.style.transformOrigin = 'top left';
      element.style.display = 'block';
      // element.style.position = 'absolute';
      // element.style.top = '50%';
      // element.style.left = '50%';
      // element.style.marginTop = `${(-1080 * scale) / 2}px`; // Center vertically
      // element.style.marginLeft = `${(-1080 * scale) / 2}px`; // Center horizontally
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
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <FiLoader className="text-4xl animate-spin text-blue-600" />
      </main>
    );
  }

  // ========================================================
  // UI
  // ========================================================
  return (
    <main className="min-h-screen bg-gray-50">
      <StepIndicator currentStep="template" />

      <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* Custom Form */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Apply Template
            </h1>
            <p className="text-gray-600">
              Customize the luxury property template and apply it to your images
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-800 border border-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Image Selection & Reordering */}
          <div className="mb-8 p-6 bg-blue-50 rounded-lg border border-blue-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FiImage className="text-blue-600" />
              Select Image for Template & Reorder
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Choose which image to apply the template to (it will be the first in the carousel). Use the buttons to reorder other images.
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {imageOrder.map((originalIndex, displayIndex) => (
                <div
                  key={originalIndex}
                  className={`relative group cursor-pointer border-4 rounded-lg overflow-hidden transition-all ${
                    selectedImageIndex === originalIndex
                      ? 'border-blue-600 ring-4 ring-blue-200'
                      : 'border-gray-200 hover:border-blue-400'
                  }`}
                  onClick={() => setSelectedImageIndex(originalIndex)}
                >
                  <Image
                    src={workflow.imageUrls[originalIndex]}
                    alt={`Image ${displayIndex + 1}`}
                    className="w-full h-32 object-cover"
                    width={200}
                    height={128}
                    unoptimized
                  />
                  
                  {/* Selected Badge */}
                  {selectedImageIndex === originalIndex && (
                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
                      <FiCheckCircle size={12} /> Template
                    </div>
                  )}
                  
                  {/* Order Number */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-60 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                    {displayIndex + 1}
                  </div>
                  
                  {/* Reorder Buttons */}
                  <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                      className="flex-1 bg-white bg-opacity-90 text-black text-xs py-1 rounded disabled:opacity-30"
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
                      className="flex-1 bg-white bg-opacity-90 text-xs py-1 text-black rounded disabled:opacity-30"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ))}
            </div>
            
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-2">
              <FiInfo className="text-blue-500" />
              Click to select which image gets the template. Use arrow buttons to change order.
            </p>
          </div>

          {/* Form */}
          <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <FiEdit2 className="text-blue-600" />
              Customize Template Text
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fields */}
              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Property Title *
                </label>
                <input
                  value={propertyTitle}
                  onChange={(e) => setPropertyTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white text-black"
                />
              </div>

              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Property Details *
                </label>
                <input
                  value={propertyDetails}
                  onChange={(e) => setPropertyDetails(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white text-black"
                />
              </div>

              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Company Name
                </label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white text-black"
                />
              </div>

              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Email
                </label>
                <input
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white text-black"
                />
              </div>

              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Phone
                </label>
                <input
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white text-black"
                />
              </div>

              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Address
                </label>
                <input
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white text-black"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={generatePreview}
                disabled={previewLoading}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg flex justify-center items-center gap-2"
              >
                {previewLoading ? (
                  <>
                    <FiLoader className="animate-spin" /> Generating Preview...
                  </>
                ) : (
                  <>
                    <FiEye /> Preview Template
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview */}
          {showPreview && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-center text-gray-900 mb-6 flex items-center gap-2 justify-center">
                <FiEye className="text-green-600" />
                Preview
              </h2>

              <div className="flex justify-center">
                <div
                  ref={previewRef}
                  style={{
                    border: '2px solid black',
                    width: '600px',
                    height: '370px',
                    backgroundColor: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    position: 'relative',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </div>

              <p className="text-center text-xs text-gray-500 mt-6">
                This is how your images will look with the template applied
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="pt-8 border-t flex gap-4">
            <button
              onClick={() => router.push('/dashboard/listing')}
              className="px-6 py-3 bg-gray-200 rounded-lg text-black flex items-center"
            >
              <FiChevronLeft /> Back
            </button>

            <button
              onClick={handleApplyTemplate}
              disabled={!showPreview || loading}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg flex justify-center gap-2"
            >
              {loading ? (
                <>
                  <FiLoader className="animate-spin" /> Applying Template...
                </>
              ) : (
                'Apply & Continue to Caption'
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
