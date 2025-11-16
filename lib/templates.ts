// Template system for property listings
// Uses html-to-image for conversion and uploads to Cloudinary

export interface Template {
  id: string;
  name: string;
  category: 'real-estate' | 'custom';
  description: string;
  defaultValues?: Record<string, string>;
}

export interface TemplateCustomValues {
  propertyTitle: string;
  propertyDetails: string;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyAddress?: string;
}

// ===============================
// PREMIUM LUXURY REAL ESTATE TEMPLATE
// ===============================

export const templates: Template[] = [
  {
    id: 'luxury-property',
    name: 'Luxury Property',
    category: 'real-estate',
    description: 'Premium luxury property showcase with gradient overlay and info cards',
    defaultValues: {
      propertyTitle: 'LUXURY PROPERTY',
      propertyDetails: 'A PREMIUM RESIDENCE',
      companyName: 'Your Brand',
      companyEmail: 'hello@reallygreatsite.com',
      companyPhone: '+123-456-7890',
      companyAddress: '123 Anywhere St, Any City, ST 12345',
    },
  },
];

// ===============================
// Helper Functions
// ===============================

export function getTemplateById(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): Template[] {
  return templates.filter((t) => t.category === category);
}

export function isValidTemplate(template: Template | undefined): boolean {
  if (!template) return false;
  return true;
}
