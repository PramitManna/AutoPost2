import { clearWorkflowSession, getWorkflowSession } from './workflow-session';

/**
 * Cancel the current upload workflow and cleanup images
 */
export async function cancelUploadWorkflow(): Promise<void> {
  const workflow = getWorkflowSession();
  
  if (!workflow) {
    return;
  }

  // Cleanup uploaded images from Cloudinary
  const publicIdsToDelete = [
    ...workflow.imagePublicIds,
    ...workflow.originalImagePublicIds,
  ].filter(Boolean);

  // Delete images from Cloudinary in parallel
  const cleanupPromises = publicIdsToDelete.map(async (publicId) => {
    try {
      await fetch(`/api/upload/delete?publicId=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to cleanup image:', publicId, error);
    }
  });

  await Promise.all(cleanupPromises);

  // Clear the workflow session
  clearWorkflowSession();
}

/**
 * Get current workflow progress for display
 */
export function getWorkflowProgress(): {
  stage: string;
  imageCount: number;
  hasTemplate: boolean;
  hasCaption: boolean;
} | null {
  const workflow = getWorkflowSession();
  
  if (!workflow) {
    return null;
  }

  return {
    stage: workflow.imageUrls.length > 0 ? 'images_uploaded' : 'empty',
    imageCount: workflow.imageUrls.length,
    hasTemplate: workflow.selectedTemplateId !== 'none',
    hasCaption: Boolean(workflow.caption),
  };
}