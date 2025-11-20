

import type { TemplateCustomValues } from './templates';

export type { TemplateCustomValues };

export interface RenderOptions {
  scale?: number;
  quality?: number;
  pixelRatio?: number;
}


/**
 * Generate the luxury property template HTML element
 */
export function generateLuxuryPropertyElement(
  imageUrl: string,
  customValues: TemplateCustomValues
): HTMLDivElement {
  const {
    propertyTitle = 'LUXURY PROPERTY',
    propertyDetails = 'A PREMIUM RESIDENCE',
    companyName = 'Your Brand',
    companyEmail = 'hello@reallygreatsite.com',
    companyPhone = '+123-456-7890',
    companyAddress = '123 Anywhere St, Any City, ST 12345',
  } = customValues;

  const container = document.createElement('div');
  container.style.cssText = `
    width: 1080px;
    height: 1080px;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', sans-serif;
    background: #0F172A;
    display: flex;
    flex-direction: column;
  `;

  container.innerHTML = `
    <!-- HERO IMAGE SECTION (65%) -->
    <div style="
      width: 100%;
      height: 65%;
      position: relative;
      overflow: hidden;
    ">
      <img src="${imageUrl}" style="
        width: 100%;
        height: 100%;
        object-fit: cover;
      " />
      
      <!-- Gradient Overlay for depth -->
      <div style="
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 40%;
        background: linear-gradient(to top, #0F172A, transparent);
      "></div>

      <!-- Floating Badge -->
      <div style="
        position: absolute;
        top: 40px;
        right: 40px;
        background: #0F172A;
        padding: 14px 32px;
        border: 1px solid #D4AF37;
        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
      ">
        <span style="
          color: #D4AF37;
          font-weight: 600;
          font-size: 14px;
          letter-spacing: 3px;
          text-transform: uppercase;
        ">Just Listed</span>
      </div>
    </div>

    <!-- CONTENT SECTION (35%) -->
    <div style="
      flex: 1;
      padding: 0 60px 60px 60px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      z-index: 10;
    ">
      <!-- Main Title Area -->
      <div style="margin-bottom: 30px;">
        <h1 style="
          margin: 0;
          font-size: 56px;
          font-weight: 800;
          line-height: 1.1;
          color: #FFFFFF;
          text-transform: uppercase;
          letter-spacing: -1px;
        ">
          ${propertyTitle}
        </h1>
        <div style="
          width: 80px;
          height: 4px;
          background: #D4AF37; /* Gold */
          margin: 20px 0;
        "></div>
        <p style="
          margin: 0;
          font-size: 24px;
          color: #94A3B8;
          font-weight: 400;
          letter-spacing: 0.5px;
        ">
          ${propertyDetails}
        </p>
      </div>

      <!-- Footer / Contact Grid -->
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        border-top: 1px solid rgba(255,255,255,0.1);
        padding-top: 30px;
        margin-top: auto;
      ">
        <!-- Contact Info -->
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 10px; color: #E2E8F0;">
            <span style="color: #D4AF37;">📞</span>
            <span style="font-size: 18px; font-weight: 500;">${companyPhone}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px; color: #E2E8F0;">
            <span style="color: #D4AF37;">✉️</span>
            <span style="font-size: 18px; font-weight: 500;">${companyEmail}</span>
          </div>
        </div>

        <!-- Branding -->
        <div style="text-align: right; display: flex; flex-direction: column; justify-content: center;">
          <span style="
            color: #FFFFFF;
            font-weight: 700;
            font-size: 22px;
            letter-spacing: 1px;
          ">${companyName}</span>
          <span style="
            color: #64748B;
            font-size: 14px;
            margin-top: 4px;
          ">${companyAddress}</span>
        </div>
      </div>
    </div>
  `;

  return container;
}




/**
 * Convert HTML element to image blob using html-to-image
 */
export async function renderTemplateToImage(
  element: HTMLElement
): Promise<Blob> {
  // Using fixed values for html2canvas configuration

  try {
    // Load html2canvas from CDN if not already loaded
    if (typeof window !== 'undefined') {
      const win = window as unknown as Record<string, unknown>;
      if (!win.html2canvas) {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }
    }

    // Wait for all images to load with better error handling
    const images = element.querySelectorAll('img');
    console.log('Found images in template:', images.length);

    for (const img of Array.from(images)) {
      console.log('Image src:', img.src);
      console.log('Image complete:', img.complete);
      console.log('Image naturalWidth:', img.naturalWidth);

      if (!img.complete || img.naturalWidth === 0) {
        console.log('Waiting for image to load...');
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            console.warn('Image load timeout for:', img.src);
            resolve(img); // Continue even if timeout
          }, 10000);

          img.onload = () => {
            clearTimeout(timeout);
            console.log('Image loaded successfully:', img.src);
            resolve(img);
          };

          img.onerror = (e) => {
            clearTimeout(timeout);
            console.error('Image failed to load:', img.src, e);
            resolve(img); // Continue even if error
          };

          // Try to reload if not loaded
          if (!img.complete) {
            const originalSrc = img.src;
            img.src = '';
            img.src = originalSrc;
          }
        });
      } else {
        console.log('Image already loaded:', img.src);
      }
    }

    // Use html2canvas to render element
    const win = window as unknown as Record<string, unknown>;
    const html2canvas = win.html2canvas as (element: HTMLElement, options: Record<string, unknown>) => Promise<HTMLCanvasElement>;

    console.log('Starting html2canvas rendering...');
    console.log('Element dimensions:', element.offsetWidth, 'x', element.offsetHeight);

    const canvas = await html2canvas(element, {
      scale: 1, // Force scale 1 for exact size
      useCORS: true,
      allowTaint: true,
      backgroundColor: 'white',
      width: 1080,
      height: 1080,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1080,
      windowHeight: 1080,
      foreignObjectRendering: false, // Try without foreign object rendering
      logging: true, // Enable logging for debugging
      onclone: (clonedDoc: Document) => {
        console.log('html2canvas cloned document');
        const clonedElement = clonedDoc.body.querySelector('div');
        if (clonedElement) {
          console.log('Cloned element found:', clonedElement.offsetWidth, 'x', clonedElement.offsetHeight);
        }
      }
    });

    console.log('html2canvas completed, canvas size:', canvas.width, 'x', canvas.height);

    const dataUrl = canvas.toDataURL('image/png', 1.0);

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    return blob;
  } catch (error) {
    console.error('Error rendering template to image:', error);
    throw error;
  }
}

/**
 * Upload image blob to Cloudinary
 */
export async function uploadToCloudinary(
  blob: Blob,
  fileName: string = 'template-image'
): Promise<{ url: string; publicId: string }> {
  try {
    const formData = new FormData();
    formData.append('file', blob, `${fileName}.png`);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload to Cloudinary');
    }

    const data = await response.json();
    return {
      url: data.url,
      publicId: data.filename,
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
}

/**
 * Complete flow: Render template and upload to Cloudinary
 */
export async function renderAndUploadTemplate(
  imageUrl: string,
  customValues: TemplateCustomValues,
  fileName: string = 'property-template'
): Promise<{ url: string; publicId: string }> {
  try {
    // Generate HTML element
    const element = generateLuxuryPropertyElement(imageUrl, customValues);

    // Temporarily add to DOM
    document.body.appendChild(element);

    // Render to image
    const imageBlob = await renderTemplateToImage(element);

    // Remove from DOM
    document.body.removeChild(element);

    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(imageBlob, fileName);

    return cloudinaryResult;
  } catch (error) {
    console.error('Error in render and upload process:', error);
    throw error;
  }
}
