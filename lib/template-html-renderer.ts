'use client';

// HTML-to-Image Template Renderer
// Converts HTML templates to images using html-to-image and uploads to Cloudinary

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
    font-family: Arial, sans-serif;
    background: white;
  `;

  container.innerHTML = `
    <!-- Top Image Section -->
    <div style="
      position: relative;
      width: 100%;
      height: 540px;
      overflow: hidden;
    ">
      <img 
        src="${imageUrl}" 
        style="
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        "
        alt="Property"
        crossorigin="anonymous"
      />
      
      <!-- Gradient Overlay -->
      <div style="
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, transparent 40%, rgba(20, 33, 61, 0.9));
      "></div>
      
      <!-- Title Section -->
      <div style="
        position: absolute;
        bottom: 40px;
        left: 0;
        width: 100%;
        text-align: center;
        padding: 0 24px;
      ">
        <h1 style="
          font-size: 56px;
          font-weight: bold;
          color: #f7d794;
          margin: 0;
          letter-spacing: 4px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.7);
        ">
          ${propertyTitle}
        </h1>
        <p style="
          color: #e0e0e0;
          font-size: 16px;
          margin: 12px 0 0 0;
          letter-spacing: 2px;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
        ">
          ${propertyDetails}
        </p>
      </div>
    </div>

    <!-- Information Boxes Section -->
    <div style="
      background-color: #14213d;
      color: white;
      padding: 32px 24px;
      height: 540px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    ">
      <div style="
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 20px;
        text-align: center;
      ">
        <!-- Box 1: Featured -->
        <div style="
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          padding: 20px;
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          <p style="
            font-size: 12px;
            letter-spacing: 1px;
            color: #ffd700;
            font-weight: 600;
            margin: 0;
          ">FEATURED</p>
          <h3 style="
            font-size: 22px;
            font-weight: bold;
            margin: 10px 0 0 0;
          ">PREMIUM HOME</h3>
        </div>

        <!-- Box 2: Price -->
        <div style="
          background: white;
          padding: 20px;
          border-radius: 12px;
          color: #1a1a1a;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          <p style="
            font-size: 12px;
            letter-spacing: 1px;
            color: #d4a700;
            font-weight: 600;
            margin: 0;
          ">START FROM</p>
          <h3 style="
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
          ">€195,000</h3>
          <p style="
            font-size: 12px;
            color: #666;
            margin: 0;
          ">with private gardens</p>
        </div>

        <!-- Box 3: Mortgage -->
        <div style="
          background: white;
          padding: 20px;
          border-radius: 12px;
          color: #1a1a1a;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        ">
          <p style="
            font-size: 12px;
            letter-spacing: 1px;
            color: #d4a700;
            font-weight: 600;
            margin: 0;
          ">MORTGAGE FROM</p>
          <h3 style="
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
          ">€880/Month</h3>
          <p style="
            font-size: 12px;
            color: #666;
            margin: 0;
          ">up to 30 years</p>
        </div>
      </div>

      <!-- Contact Section -->
      <div style="
        text-align: center;
        margin: 24px 0;
      ">
        <p style="
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 1.5px;
          font-size: 16px;
          margin: 0;
        ">
          BOOK A TOUR! • ${companyEmail}
        </p>
      </div>

      <!-- Footer -->
      <div style="
        border-top: 1px solid rgba(255, 255, 255, 0.2);
        padding-top: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: rgba(255, 255, 255, 0.8);
        font-size: 15px;
        flex-wrap: wrap;
        gap: 16px;
      ">
        <p style="margin: 0;">📧 ${companyName}</p>
        <p style="margin: 0;">📞 ${companyPhone}</p>
        <p style="margin: 0;">📌 ${companyAddress}</p>
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
