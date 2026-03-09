'use client';

import Link from 'next/link';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';

const STEPS = [
  { label: 'Category', step: 1 },
  { label: 'Details', step: 2 },
  { label: 'Location', step: 3 },
  { label: 'Review', step: 4 },
];

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
}

export default function StepIndicator({ currentStep, totalSteps = 4 }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {STEPS.map(({ label, step }, index) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all ${
                isCompleted
                  ? 'border-[#2563EB] bg-[#2563EB] text-white'
                  : isActive
                  ? 'border-[#2563EB] bg-blue-50 text-[#2563EB]'
                  : 'border-gray-300 bg-white text-gray-500'
              }`}
              aria-current={isActive ? 'step' : undefined}
            >
              {isCompleted ? (
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step
              )}
            </div>
            <span
              className={`hidden text-sm sm:inline ${
                isActive ? 'font-semibold text-gray-900' : isCompleted ? 'text-gray-600' : 'text-gray-500'
              }`}
            >
              {label}
            </span>
            {index < STEPS.length - 1 && (
              <div
                className={`hidden h-0.5 w-4 rounded-full sm:block ${
                  isCompleted ? 'bg-[#2563EB]' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function BusinessOnboardingHeader({
  currentStep,
  title,
  subtitle,
  showBack = true,
}: {
  currentStep: number;
  title: string;
  subtitle: string;
  showBack?: boolean;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
      <div className={CONTENT_CONTAINER_CLASS}>
        <div className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            {showBack && (
              <Link
                href="/mybusiness"
                className="flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
              >
                <span aria-hidden>←</span> Back
              </Link>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900 sm:text-xl">{title}</h1>
              <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>
            </div>
          </div>
          <div className="text-right text-sm font-medium text-gray-500">
            Step {currentStep} of 4
          </div>
        </div>
        <div className="pb-4">
          <StepIndicator currentStep={currentStep} totalSteps={4} />
        </div>
      </div>
    </header>
  );
}
