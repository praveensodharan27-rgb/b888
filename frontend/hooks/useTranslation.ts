'use client';

import { useState, useEffect } from 'react';
import { getTranslation, getCurrentLanguage, setLanguage as setLang, languages, Language } from '@/lib/translations';

export function useTranslation() {
  // Always start with 'en' for SSR to prevent hydration mismatch
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only set language after component mounts on client
    setMounted(true);
    const lang = getCurrentLanguage();
    setCurrentLang(lang);
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang;
    }

    // Listen for language changes
    const handleLanguageChange = (event: CustomEvent) => {
      setCurrentLang(event.detail.lang);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  const t = (key: string): string => {
    // During SSR or before mount, always return English to prevent hydration mismatch
    if (!mounted) {
      return getTranslation(key, 'en');
    }
    return getTranslation(key, currentLang);
  };

  const changeLanguage = (lang: string) => {
    setLang(lang);
    setCurrentLang(lang);
    // Force re-render by updating state
    if (typeof window !== 'undefined') {
      document.documentElement.lang = lang;
      // Dispatch event to notify all components
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }
  };

  return {
    t,
    currentLang: mounted ? currentLang : 'en', // Return 'en' during SSR
    languages,
    changeLanguage,
    mounted, // Expose mounted state if needed
  };
}

