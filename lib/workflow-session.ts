/**
 * Secure workflow session management
 * Stores workflow state in memory with session validation
 */

export interface WorkflowData {
  imageUrls: string[];
  imagePublicIds: string[];
  originalImageUrls: string[]; // Store original images for AI analysis
  originalImagePublicIds: string[];
  previewUrls: string[];
  selectedTemplateId: string;
  templateCustomValues: Record<string, string | undefined>;
  caption: string;
  generatedCaption: string;
  // Listing Information
  address: string;
  zipCode: string;
  propertyType: string;
  propertyTypeOther: string;
  bedrooms: string;
  bathrooms: string;
  propertySize: string;
  parking: string;
  view: string;
  highlights: string;
  agencyName: string;
  brokerageName: string;
  // Session metadata
  timestamp: number;
  sessionId: string;
}

const DEFAULT_SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const WORKFLOW_STORAGE_KEY = 'workflow_state';

/**
 * Generate a secure session ID
 */
export function generateSessionId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Initialize empty workflow data
 */
export function createEmptyWorkflow(sessionId: string): WorkflowData {
  return {
    imageUrls: [],
    imagePublicIds: [],
    originalImageUrls: [],
    originalImagePublicIds: [],
    previewUrls: [],
    selectedTemplateId: 'none',
    templateCustomValues: {},
    caption: '',
    generatedCaption: '',
    address: '',
    zipCode: '',
    propertyType: '',
    propertyTypeOther: '',
    bedrooms: '',
    bathrooms: '',
    propertySize: '',
    parking: '',
    view: '',
    highlights: '',
    agencyName: '',
    brokerageName: '',
    timestamp: Date.now(),
    sessionId,
  };
}

/**
 * Store workflow data in session storage (client-side only)
 */
export function saveWorkflowSession(data: WorkflowData): void {
  if (typeof window === 'undefined') {
    console.warn('Cannot save workflow session on server');
    return;
  }

  try {
    sessionStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save workflow session:', error);
  }
}

/**
 * Retrieve workflow data from session storage with validation
 */
export function getWorkflowSession(): WorkflowData | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = sessionStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!stored) return null;

    const data = JSON.parse(stored) as WorkflowData;

    // Validate session timeout
    const elapsed = Date.now() - data.timestamp;
    if (elapsed > DEFAULT_SESSION_TIMEOUT) {
      clearWorkflowSession();
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to retrieve workflow session:', error);
    return null;
  }
}

/**
 * Clear workflow session
 */
export function clearWorkflowSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    sessionStorage.removeItem(WORKFLOW_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear workflow session:', error);
  }
}

/**
 * Update specific workflow fields
 */
export function updateWorkflowSession(
  updates: Partial<WorkflowData>
): WorkflowData | null {
  let current = getWorkflowSession();

  // If no session exists, create a new one
  if (!current) {
    const sessionId = generateSessionId();
    current = createEmptyWorkflow(sessionId);
  }

  const updated: WorkflowData = {
    ...current,
    ...updates,
    timestamp: Date.now(), // Update timestamp on every change
  };

  saveWorkflowSession(updated);
  return updated;
}

/**
 * Validate required fields for each stage
 */
export function validateWorkflowStage(
  stage: 'upload' | 'listing' | 'template' | 'caption' | 'publish'
): { valid: boolean; errors: string[] } {
  const workflow = getWorkflowSession();
  const errors: string[] = [];

  if (!workflow) {
    return { valid: false, errors: ['Session expired. Please start over.'] };
  }

  switch (stage) {
    case 'upload':
      break;

    case 'listing':
      if (!workflow.imageUrls || workflow.imageUrls.length === 0) {
        errors.push('No images in session');
      }
      break;

    case 'template':
      if (!workflow.imageUrls || workflow.imageUrls.length === 0) {
        errors.push('No images in session');
      }
      break;

    case 'caption':
      if (!workflow.imageUrls || workflow.imageUrls.length === 0) {
        errors.push('Images not processed. Please go back to upload.');
      }
      break;

    case 'publish':
      if (!workflow.imageUrls || workflow.imageUrls.length === 0) {
        errors.push('Images not available');
      }
      if (!workflow.caption || workflow.caption.trim().length === 0) {
        errors.push('Caption is required');
      }
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get progress percentage based on current stage
 */
export function getProgressPercentage(
  stage: 'upload' | 'listing' | 'template' | 'caption' | 'publish'
): number {
  const stages = { upload: 20, listing: 40, template: 60, caption: 80, publish: 100 };
  return stages[stage];
}
