'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiChevronLeft, FiLoader, FiChevronDown } from 'react-icons/fi';
import { motion } from 'framer-motion';
import StepIndicator from '@/components/StepIndicator';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { getWorkflowSession, updateWorkflowSession, validateWorkflowStage } from '@/lib/workflow-session';
import type { WorkflowData } from '@/lib/workflow-session';

export default function ListingPage() {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [address, setAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [propertyType, setPropertyType] = useState('');
  const [propertyTypeOther, setPropertyTypeOther] = useState('');
  const [bedrooms, setBedrooms] = useState('');
  const [bathrooms, setBathrooms] = useState('');
  const [propertySize, setPropertySize] = useState('');
  const [parking, setParking] = useState('');
  const [view, setView] = useState('');
  const [highlights, setHighlights] = useState('');
  const [agencyName, setAgencyName] = useState('');
  const [brokerageName, setBrokerageName] = useState('');

  useEffect(() => {
    // Validate session and required data
    const validation = validateWorkflowStage('listing');
    if (!validation.valid) {
      router.push('/dashboard/upload?connected=true');
      return;
    }

    const session = getWorkflowSession();
    if (session) {
      setWorkflow(session);
      // Load existing values if they exist
      setAddress(session.address || '');
      setZipCode(session.zipCode || '');
      setPropertyType(session.propertyType || '');
      setPropertyTypeOther(session.propertyTypeOther || '');
      setBedrooms(session.bedrooms || '');
      setBathrooms(session.bathrooms || '');
      setPropertySize(session.propertySize || '');
      setParking(session.parking || '');
      setView(session.view || '');
      setHighlights(session.highlights || '');
      setAgencyName(session.agencyName || '');
      setBrokerageName(session.brokerageName || '');
    }
  }, [router]);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);

    try {
      updateWorkflowSession({
        address,
        zipCode,
        propertyType,
        propertyTypeOther,
        bedrooms,
        bathrooms,
        propertySize,
        parking,
        view,
        highlights,
        agencyName,
        brokerageName,
      });

      router.push('/dashboard/template?connected=true');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save listing information');
    } finally {
      setLoading(false);
    }
  };

  if (!workflow) {
    return (
      <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <FiLoader className="text-4xl animate-spin text-zinc-900 dark:text-zinc-50" />
      </main>
    );
  }

  const selectClassName = "w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent text-zinc-900 dark:text-zinc-50 transition-all appearance-none cursor-pointer";

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 pb-20">
      <StepIndicator currentStep="listing" />

      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-3 tracking-tight">Listing Information</h1>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Share details about the property to help generate better templates and captions. All fields are optional.
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center"
            >
              {error}
            </motion.div>
          )}

          <Card className="p-4 sm:p-8">
            <div className="space-y-6">
              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Property Address (Optional)
                </label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g., 24 6929 142 Street, Surrey"
                />
              </div>

              {/* Zip Code */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Zip Code (Optional)
                </label>
                <Input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  placeholder="e.g., V3W 0A1"
                />
              </div>

              {/* Property Type */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Property Type
                </label>
                <div className="relative">
                  <select
                    value={propertyType}
                    onChange={(e) => setPropertyType(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Select property type</option>
                    <option value="Condo">Condo</option>
                    <option value="Townhome">Townhome</option>
                    <option value="Detached">Detached</option>
                    <option value="Semi-Detached">Semi-Detached</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Office Space">Office Space</option>
                    <option value="Other">Other</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <FiChevronDown />
                  </div>
                </div>

                {propertyType === 'Other' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mt-3"
                  >
                    <Input
                      value={propertyTypeOther}
                      onChange={(e) => setPropertyTypeOther(e.target.value)}
                      placeholder="Please specify the property type"
                    />
                  </motion.div>
                )}
              </div>

              {/* Bedrooms and Bathrooms Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Bedrooms
                  </label>
                  <div className="relative">
                    <select
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Select bedrooms</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5+">5+</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <FiChevronDown />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                    Bathrooms
                  </label>
                  <div className="relative">
                    <select
                      value={bathrooms}
                      onChange={(e) => setBathrooms(e.target.value)}
                      className={selectClassName}
                    >
                      <option value="">Select bathrooms</option>
                      <option value="1">1</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5+">5+</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                      <FiChevronDown />
                    </div>
                  </div>
                </div>
              </div>

              {/* Property Size */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Property Size
                </label>
                <div className="relative">
                  <select
                    value={propertySize}
                    onChange={(e) => setPropertySize(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Select property size</option>
                    <option value="<500 sq ft">&lt;500 sq ft</option>
                    <option value="500-600 sq ft">500–600 sq ft</option>
                    <option value="600-700 sq ft">600–700 sq ft</option>
                    <option value="700-800 sq ft">700–800 sq ft</option>
                    <option value="800-900 sq ft">800–900 sq ft</option>
                    <option value="900-1000 sq ft">900–1000 sq ft</option>
                    <option value="1000-1500 sq ft">1000–1500 sq ft</option>
                    <option value="1500-2000 sq ft">1500–2000 sq ft</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <FiChevronDown />
                  </div>
                </div>
              </div>

              {/* Parking */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Parking
                </label>
                <div className="relative">
                  <select
                    value={parking}
                    onChange={(e) => setParking(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Select parking</option>
                    <option value="Covered">Covered</option>
                    <option value="Uncovered">Uncovered</option>
                    <option value="None">None</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <FiChevronDown />
                  </div>
                </div>
              </div>

              {/* View */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  View (Optional)
                </label>
                <div className="relative">
                  <select
                    value={view}
                    onChange={(e) => setView(e.target.value)}
                    className={selectClassName}
                  >
                    <option value="">Select view</option>
                    <option value="Lake">Lake</option>
                    <option value="City">City</option>
                    <option value="Park">Park</option>
                    <option value="Mountain">Mountain</option>
                    <option value="None">None</option>
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                    <FiChevronDown />
                  </div>
                </div>
              </div>

              {/* Optional Highlights */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Anything else you&apos;d like to highlight? (Optional)
                </label>
                <textarea
                  value={highlights}
                  onChange={(e) => setHighlights(e.target.value)}
                  placeholder="E.g., recently renovated kitchen, hardwood floors, rooftop access..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent resize-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 transition-all"
                />
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-2 text-right">
                  {highlights.length}/500 characters
                </p>
              </div>

              {/* Agency Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <Input
                  label="Agency Name (Optional)"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  placeholder="e.g., Alpine Real Estate Group"
                />
                <Input
                  label="Brokerage Name (Optional)"
                  value={brokerageName}
                  onChange={(e) => setBrokerageName(e.target.value)}
                  placeholder="e.g., Woodhouse Realty"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-8 border-t border-zinc-200 dark:border-zinc-800 flex flex-col-reverse sm:flex-row gap-4 justify-between">
              <Button
                onClick={() => router.push('/dashboard/upload?connected=true')}
                disabled={loading}
                variant="ghost"
                leftIcon={<FiChevronLeft />}
                className="w-full sm:w-auto"
              >
                Back
              </Button>
              <Button
                onClick={handleContinue}
                disabled={loading}
                variant="primary"
                size="lg"
                isLoading={loading}
                className="w-full sm:w-auto min-w-[150px]"
              >
                Continue
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
