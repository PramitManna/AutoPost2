'use client';

import { FiCheckCircle } from 'react-icons/fi';

interface StepIndicatorProps {
  currentStep: 'upload' | 'listing' | 'template' | 'caption' | 'publish';
}

export default function StepIndicator({ currentStep }: StepIndicatorProps) {
  const steps = [
    { id: 'upload', label: 'Upload', description: 'Choose images' },
    { id: 'listing', label: 'Listing', description: 'Property info' },
    { id: 'template', label: 'Template', description: 'Apply design' },
    { id: 'caption', label: 'Caption', description: 'Add text' },
    { id: 'publish', label: 'Publish', description: 'Post' },
  ];

  const stepOrder = ['upload', 'listing', 'template', 'caption', 'publish'];
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="w-full bg-white/80 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-950/80 dark:border-zinc-800 sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between relative">
          {/* Progress Bar Background */}
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-100 dark:bg-zinc-800 -z-10" />

          {/* Active Progress Bar */}
          <div
            className="absolute top-1/2 left-0 h-0.5 bg-zinc-900 dark:bg-zinc-50 -z-10 transition-all duration-500 ease-in-out"
            style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, index) => {
            const isActive = index === currentIndex;
            const isCompleted = index < currentIndex;

            return (
              <div key={step.id} className="flex flex-col items-center relative">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${isActive
                      ? 'bg-zinc-900 border-zinc-900 text-white scale-110 dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-900 shadow-lg'
                      : isCompleted
                        ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-900'
                        : 'bg-white border-zinc-300 text-zinc-400 dark:bg-zinc-950 dark:border-zinc-700 dark:text-zinc-600'
                    }`}
                >
                  {isCompleted ? (
                    <FiCheckCircle className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>
                <div className="mt-2 absolute top-8 w-20 text-center hidden sm:block">
                  <p
                    className={`text-xs font-medium transition-colors duration-300 ${isActive
                        ? 'text-zinc-900 dark:text-zinc-50'
                        : 'text-zinc-500 dark:text-zinc-500'
                      }`}
                  >
                    {step.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
