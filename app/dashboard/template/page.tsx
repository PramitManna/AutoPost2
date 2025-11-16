'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiLoader, FiEdit2, FiEye } from 'react-icons/fi';
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

  /** Insert preview element into previewRef */
  useEffect(() => {
    if (previewElement && previewRef.current) {
      previewRef.current.innerHTML = '';
      
      // Set display block to ensure proper rendering
      previewElement.style.display = 'block';
      
      previewRef.current.appendChild(previewElement);
    }
  }, [previewElement]);

  // ========================================================
  // 🔥 FIXED PREVIEW GENERATOR — Auto-fit 1080×1080 templates
  // ========================================================
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

      // Generate the template element (1080×1080)
      const element = generateLuxuryPropertyElement(
        workflow.imageUrls[0],
        customValues
      );

      // Calculate scale to fit 600px container
      const scale = 600 / 1080; // ~0.556

      // Apply transform to scale down and position correctly
      element.style.transform = `scale(${scale})`;
      element.style.transformOrigin = 'top left';
      element.style.display = 'block';
      element.style.position = 'absolute';
      element.style.top = '50%';
      element.style.left = '50%';
      element.style.marginTop = `${(-1080 * scale) / 2}px`; // Center vertically
      element.style.marginLeft = `${(-1080 * scale) / 2}px`; // Center horizontally

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
  // APPLY TEMPLATE — Same as before
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

      const uploadedUrls: string[] = [];
      const uploadedPublicIds: string[] = [];

      for (let i = 0; i < workflow.imageUrls.length; i++) {
        const element = generateLuxuryPropertyElement(
          workflow.imageUrls[i],
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
        console.log(`Rendered template ${i} blob size:`, imageBlob.size, 'bytes');

        const cloud = await uploadToCloudinary(
          imageBlob,
          `property-template-${i}`
        );

        console.log(`Template ${i} upload result:`, cloud);
        
        if (!cloud.url) {
          throw new Error(`Failed to get URL for image ${i}`);
        }

        uploadedUrls.push(cloud.url);
        uploadedPublicIds.push(cloud.publicId);
        console.log(`Added URL ${i}:`, cloud.url);
      }

      // Preserve original images for AI analysis
      updateWorkflowSession({
        originalImageUrls: workflow.imageUrls, // Store current images as original
        originalImagePublicIds: workflow.imagePublicIds,
        imageUrls: uploadedUrls, // Update with templated images
        imagePublicIds: uploadedPublicIds,
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
                  className="w-full px-4 py-2 border rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Email
                </label>
                <input
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Phone
                </label>
                <input
                  value={companyPhone}
                  onChange={(e) => setCompanyPhone(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white"
                />
              </div>

              <div>
                <label className="font-medium text-sm text-gray-700 mb-1 block">
                  Address
                </label>
                <input
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg bg-white"
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
              
              <button
                onClick={async () => {
                  try {
                    console.log('Starting simple test...');
                    
                    // Check if html2canvas is loaded
                    const win = window as unknown as { html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement> };
                    if (!win.html2canvas) {
                      console.error('html2canvas not loaded!');
                      alert('html2canvas not loaded!');
                      return;
                    }
                    console.log('html2canvas is loaded');
                    
                    // Create a simple test element
                    const testDiv = document.createElement('div');
                    testDiv.style.width = '200px';
                    testDiv.style.height = '200px';
                    testDiv.style.background = 'linear-gradient(45deg, red, blue)';
                    testDiv.style.color = 'white';
                    testDiv.style.fontSize = '20px';
                    testDiv.style.display = 'flex';
                    testDiv.style.alignItems = 'center';
                    testDiv.style.justifyContent = 'center';
                    testDiv.textContent = 'TEST';
                    testDiv.style.position = 'fixed';
                    testDiv.style.top = '-1000px';
                    
                    document.body.appendChild(testDiv);
                    console.log('Test element created and added to DOM');
                    
                    // Try to capture it
                    const canvas = await win.html2canvas(testDiv, {
                      scale: 1,
                      width: 200,
                      height: 200,
                      backgroundColor: 'white'
                    });
                    
                    document.body.removeChild(testDiv);
                    console.log('Canvas created:', canvas.width, 'x', canvas.height);
                    
                    // Convert to blob
                    canvas.toBlob((blob: Blob | null) => {
                      if (blob) {
                        console.log('Blob created, size:', blob.size);
                        const dataUrl = URL.createObjectURL(blob);
                        window.open(dataUrl, '_blank');
                      } else {
                        console.error('Failed to create blob');
                        alert('Failed to create blob');
                      }
                    }, 'image/png');
                    
                  } catch (err) {
                    console.error('Simple test failed:', err);
                    alert('Simple test failed: ' + (err as Error).message);
                  }
                }}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg text-sm"
              >
                🧪 Simple Test (Red/Blue Gradient)
              </button>
              
              <button
                onClick={async () => {
                  if (!workflow) return;
                  try {
                    console.log('Testing actual template generation...');
                    console.log('Using image URL:', workflow.imageUrls[0]);
                    
                    const customValues = { propertyTitle, propertyDetails, companyName, companyEmail, companyPhone, companyAddress };
                    const element = generateLuxuryPropertyElement(workflow.imageUrls[0], customValues);
                    
                    console.log('Template element created:', element);
                    console.log('Element dimensions:', element.style.width, element.style.height);
                    
                    // Add to DOM temporarily
                    element.style.position = 'fixed';
                    element.style.top = '-2000px';
                    element.style.left = '0px';
                    element.style.zIndex = '-999';
                    
                    document.body.appendChild(element);
                    console.log('Element added to DOM');
                    
                    // Wait for images to load
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    console.log('Waited for images to load');
                    
                    // Try to render with html2canvas
                    const win = window as unknown as { html2canvas?: (element: HTMLElement, options?: Record<string, unknown>) => Promise<HTMLCanvasElement> };
                    if (win.html2canvas) {
                      const canvas = await win.html2canvas(element, {
                        scale: 1,
                        width: 1080,
                        height: 1080,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: 'white'
                      });
                      
                      document.body.removeChild(element);
                      console.log('Canvas generated:', canvas.width, 'x', canvas.height);
                      
                      // Convert to data URL and open
                      const dataUrl = canvas.toDataURL('image/png');
                      console.log('Data URL length:', dataUrl.length);
                      window.open(dataUrl, '_blank');
                    }
                    
                  } catch (err) {
                    console.error('Template test failed:', err);
                    alert('Template test failed: ' + (err as Error).message);
                  }
                }}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg text-sm"
              >
                🎨 Test Full Template Render
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
                    width: '600px',
                    height: '580px',
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
              className="px-6 py-3 bg-gray-100 rounded-lg"
            >
              <FiChevronLeft /> Back
            </button>

            <button
              onClick={handleApplyTemplate}
              disabled={!showPreview || loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg flex justify-center gap-2"
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
