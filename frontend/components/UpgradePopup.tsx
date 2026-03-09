'use client';

import { FiBriefcase, FiStar, FiX } from 'react-icons/fi';
import Link from 'next/link';

const TITLE = 'Free Ads Limit Reached';
const MESSAGE_ML = 'ഈ മാസം ലഭിച്ച free ads മുഴുവൻ ഉപയോഗിച്ചു.\nഇനി post ചെയ്യാൻ Business Package അല്ലെങ്കിൽ Premium Ad തിരഞ്ഞെടുക്കുക.';

interface UpgradePopupProps {
  open: boolean;
  onClose: () => void;
  onSelectPremium?: () => void;
}

export default function UpgradePopup({ open, onClose, onSelectPremium }: UpgradePopupProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-labelledby="upgrade-popup-title">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <FiX className="h-5 w-5" />
        </button>
        <h2 id="upgrade-popup-title" className="text-xl font-bold text-gray-900 pr-8">
          {TITLE}
        </h2>
        <p className="mt-3 whitespace-pre-line text-gray-600">
          {MESSAGE_ML}
        </p>
        <div className="mt-6 flex flex-col gap-3">
          <Link
            href="/business-package"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 font-semibold text-white hover:bg-indigo-700"
          >
            <FiBriefcase className="h-5 w-5" />
            Buy Business Package
          </Link>
          <button
            type="button"
            onClick={() => {
              onClose();
              onSelectPremium?.();
            }}
            className="flex items-center justify-center gap-2 rounded-lg border-2 border-amber-500 bg-amber-50 px-4 py-3 font-semibold text-amber-800 hover:bg-amber-100"
          >
            <FiStar className="h-5 w-5" />
            Select Premium Ad
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
