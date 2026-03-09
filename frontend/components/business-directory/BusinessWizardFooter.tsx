'use client';

import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';

interface BusinessWizardFooterProps {
  onBack?: () => void;
  onSkip?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  showSkip?: boolean;
  showFooterInfo?: boolean;
}

export default function BusinessWizardFooter({
  onBack,
  onSkip,
  onContinue,
  continueLabel = 'Continue',
  continueDisabled = false,
  showSkip = false,
  showFooterInfo = false,
}: BusinessWizardFooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-gray-100 py-4">
      <div className={CONTENT_CONTAINER_CLASS}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            {showFooterInfo && (
              <>
                <span
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-300 text-xs font-medium text-gray-500"
                  aria-hidden
                >
                  i
                </span>
                <span className="text-sm text-gray-500">
                  You can change this later in your profile settings.
                </span>
              </>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                ← Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showSkip && onSkip && (
              <button
                type="button"
                onClick={onSkip}
                className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={onContinue}
              disabled={continueDisabled}
              className="inline-flex items-center justify-center rounded-xl bg-[#2563EB] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {continueLabel}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
