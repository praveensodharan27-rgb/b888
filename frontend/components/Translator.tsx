'use client';

import { useState, useEffect, useRef } from 'react';
import { FiGlobe, FiChevronDown } from 'react-icons/fi';
import { useTranslation } from '@/hooks/useTranslation';

export default function Translator() {
  const { currentLang, languages, changeLanguage } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const selectedLanguage = languages.find(l => l.code === currentLang) || languages[0];

  const handleLanguageSelect = (langCode: string) => {
    changeLanguage(langCode);
    setDropdownOpen(false);
    // Trigger a re-render by dispatching language change event
    // Components using useTranslation will automatically update
  };

  if (!mounted) {
    return (
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
          title="Translate Page"
          disabled
        >
          <FiGlobe className="w-5 h-5" />
          <span className="text-sm font-medium hidden sm:inline">Translate</span>
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-2" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 text-gray-700 hover:text-primary-600 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
        title="Translate Page"
      >
        <FiGlobe className="w-5 h-5" />
        <span className="text-sm font-medium hidden sm:inline">{selectedLanguage.nativeName}</span>
        <FiChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {dropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
          <div className="p-2">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-colors flex items-center justify-between ${
                  currentLang === lang.code
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-sm">{lang.nativeName}</span>
                  <span className="text-xs text-gray-500">{lang.name}</span>
                </div>
                {currentLang === lang.code && (
                  <div className="w-2 h-2 bg-primary-600 rounded-full"></div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

