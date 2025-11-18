
// HTML-to-Image Template Renderer
// Converts HTML templates to images using html-to-image and uploads to Cloudinary
import * as htmlToImage from 'html-to-image';
import { toPng, toJpeg, toBlob, toPixelData, toSvg } from 'html-to-image';

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
  container.style = `
    width: 1080px;
    height: 1080px;
    position: relative;
    overflow: hidden;
    font-family: 'Inter', Arial, sans-serif;
    background: #ffffff;
    display: flex;
    flex-direction: column;
  `;

  container.innerHTML = `
    <!-- HERO IMAGE -->
    <div style="
      width: 100%;
      height: 47%;
      position: relative;
      overflow: hidden;
    ">
      <img src="${imageUrl}" style="
        width: 100%;
        height: 100%;
        object-fit: cover;
      " />

      <div style="
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, rgba(0,0,0,0) 30%, rgba(0,0,0,0.6));
      "></div>

      <div style="
        position: absolute;
        bottom: 40px;
        left: 50%;
        transform: translateX(-50%);
        text-align: center;
        width: 100%;
      ">
        <h1 style="
          margin: 0;
          font-size: 60px;
          font-weight: 700;
          letter-spacing: 3px;
          color: #F5D68B;
          text-shadow: 0 3px 10px rgba(0,0,0,0.4);
        ">
          ${propertyTitle}
        </h1>

        <p style="
          margin: 12px 0 0;
          font-size: 20px;
          letter-spacing: 2px;
          color: #ffffffcc;
        ">
          ${propertyDetails}
        </p>
      </div>
    </div>

    <!-- CONTENT AREA -->
    <div style="
      width: 100%;
      height: 53%;
      background: #0F1A2B;
      padding: 60px;
      box-sizing: border-box;
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    ">

      <!-- STATIC FEATURE BOXES -->
      <div style="
        display: flex;
        justify-content: center;
        gap: 40px;
        margin-top: 10px;
      ">
        <!-- BOX A -->
        <div style="
          padding: 26px 34px;
          width: 280px;
          border-radius: 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(245,214,139,0.45);
          backdrop-filter: blur(10px);
          text-align: center;
        ">
          <p style="
            color: #F5D68B;
            font-size: 14px;
            letter-spacing: 2px;
            margin: 0 0 10px;
            font-weight: 600;
          ">FEATURED</p>

          <h3 style="
            margin: 0;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #ffffff;
          ">PREMIUM HOME</h3>
        </div>

        <!-- BOX B -->
        <div style="
          padding: 26px 34px;
          width: 280px;
          border-radius: 18px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(245,214,139,0.45);
          backdrop-filter: blur(10px);
          text-align: center;
        ">
          <p style="
            color: #F5D68B;
            font-size: 14px;
            letter-spacing: 2px;
            margin: 0 0 10px;
            font-weight: 600;
          ">HIGHLIGHT</p>

          <h3 style="
            margin: 0;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #ffffff;
          ">MODERN LIVING</h3>
        </div>
      </div>

      <!-- CONTACT -->
      <div style="text-align: center; margin-top: 20px;">
        <p style="
          font-size: 20px;
          letter-spacing: 2px;
          margin: 0;
          color: rgba(255,255,255,0.9);
        ">
          BOOK A TOUR • ${companyEmail}
        </p>
      </div>

      <!-- FOOTER -->
      <div style="
        margin-top: 32px;
        padding-top: 26px;
        border-top: 1px solid rgba(255,255,255,0.2);
        display: flex;
        justify-content: space-between;
        font-size: 18px;
        opacity: 0.85;
      ">
        <p style="margin: 0;">🏢 ${companyName}</p>
        <p style="margin: 0;">📞 ${companyPhone}</p>
        <p style="margin: 0;">📍 ${companyAddress}</p>
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
