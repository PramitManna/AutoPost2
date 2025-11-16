// Client-side template rendering - DEPRECATED
// This file is kept for backwards compatibility but is no longer actively used.
// 
// The new template system uses HTML/CSS rendering with html2canvas:
// See: /lib/template-html-renderer.ts
//
// The old Canvas API-based rendering has been replaced with:
// - generateLuxuryPropertyElement() - Creates HTML element
// - renderTemplateToImage() - Converts HTML to PNG using html2canvas
// - uploadToCloudinary() - Uploads the rendered image

/**
 * @deprecated Use template-html-renderer.ts instead
 */
export async function applyTemplate(): Promise<Blob> {
  throw new Error('applyTemplate() is deprecated. Use the new template system in template-html-renderer.ts');
}

/**
 * @deprecated Use template-html-renderer.ts instead
 */
export async function previewTemplate(): Promise<string> {
  throw new Error('previewTemplate() is deprecated. Use the new template system in template-html-renderer.ts');
}

/**
 * @deprecated Use template-html-renderer.ts instead
 */
export async function getTemplatePreviewUrl(): Promise<string> {
  throw new Error('getTemplatePreviewUrl() is deprecated. Use the new template system in template-html-renderer.ts');
}
