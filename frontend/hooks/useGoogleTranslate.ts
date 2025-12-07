'use client';

import { useState, useEffect, useCallback } from 'react';
import { translateText, translateBatch, getGoogleLanguageCode } from '@/lib/googleTranslate';
import { getCurrentLanguage } from '@/lib/translations';

/**
 * Hook to translate page content using Google Cloud Translation API
 */
export function useGoogleTranslate() {
  const [currentLang, setCurrentLang] = useState<string>('en');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationCache, setTranslationCache] = useState<Record<string, Record<string, string>>>({});

  useEffect(() => {
    // Don't run on server side
    if (typeof window === 'undefined') return;

    // Load saved language
    const savedLang = getCurrentLanguage();
    setCurrentLang(savedLang);

    // Listen for language changes
    const handleLanguageChange = (event: CustomEvent) => {
      const newLang = event.detail.lang;
      setCurrentLang(newLang);
      translatePage(newLang);
    };

    window.addEventListener('languageChanged', handleLanguageChange as EventListener);

    // Translate on mount if language is not English
    if (savedLang !== 'en') {
      translatePage(savedLang);
    }

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange as EventListener);
    };
  }, []);

  /**
   * Translate a single text element
   */
  const translate = useCallback(async (text: string, sourceLang: string = 'en'): Promise<string> => {
    if (currentLang === 'en' || !text || text.trim() === '') {
      return text;
    }

    // Check cache first
    const cacheKey = `${sourceLang}-${currentLang}`;
    if (translationCache[cacheKey]?.[text]) {
      return translationCache[cacheKey][text];
    }

    try {
      const translated = await translateText(text, getGoogleLanguageCode(currentLang), sourceLang);
      
      // Cache the translation
      setTranslationCache(prev => ({
        ...prev,
        [cacheKey]: {
          ...prev[cacheKey],
          [text]: translated,
        },
      }));

      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }, [currentLang, translationCache]);

  /**
   * Restore original English content
   */
  const restoreOriginalContent = useCallback(() => {
    if (typeof document === 'undefined') return;
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    let node;
    while ((node = walker.nextNode())) {
      if (node instanceof Text && (node as any).__originalText) {
        node.textContent = (node as any).__originalText;
        delete (node as any).__originalText;
      }
    }
  }, []);

  /**
   * Restore original attributes when switching back to English
   */
  const restoreAttributes = useCallback(() => {
    if (typeof document === 'undefined') return;
    
    const elements = document.querySelectorAll('[placeholder], [alt], [title], [aria-label]');
    elements.forEach((element) => {
      if ((element as any).__originalAttributes) {
        Object.entries((element as any).__originalAttributes).forEach(([attr, value]) => {
          element.setAttribute(attr, value as string);
        });
        delete (element as any).__originalAttributes;
      }
    });
  }, []);

  /**
   * Translate HTML attributes like placeholders, alt texts, titles
   */
  const translateAttributes = useCallback(async (targetLang: string) => {
    if (targetLang === 'en' || typeof document === 'undefined') return;

    try {
      const elements = document.querySelectorAll('[placeholder], [alt], [title], [aria-label]');
      const attributesToTranslate: Array<{
        element: Element;
        attr: string;
        originalText: string;
      }> = [];

      elements.forEach((element) => {
        if (element.hasAttribute('data-no-translate') || element.closest('[data-no-translate]')) {
          return;
        }

        ['placeholder', 'alt', 'title', 'aria-label'].forEach((attr) => {
          const value = element.getAttribute(attr);
          if (value && value.trim() && !/^[\d\s\W]+$/.test(value.trim())) {
            // Store original value
            if (!(element as any).__originalAttributes) {
              (element as any).__originalAttributes = {};
            }
            (element as any).__originalAttributes[attr] = value;
            
            attributesToTranslate.push({
              element,
              attr,
              originalText: value,
            });
          }
        });
      });

      if (attributesToTranslate.length === 0) return;

      const texts = attributesToTranslate.map(a => a.originalText);
      const translations = await translateBatch(
        texts,
        getGoogleLanguageCode(targetLang),
        'en'
      );

      attributesToTranslate.forEach(({ element, attr }, index) => {
        if (translations[index]) {
          element.setAttribute(attr, translations[index]);
        }
      });
    } catch (error) {
      console.error('Attribute translation error:', error);
    }
  }, []);

  /**
   * Translate all text content on the page
   */
  const translatePage = useCallback(async (targetLang: string = currentLang) => {
    if (targetLang === 'en') {
      // If switching to English, restore original content
      restoreOriginalContent();
      restoreAttributes();
      return;
    }

    if (typeof document === 'undefined') return;

    setIsTranslating(true);

    try {
      // Get all text nodes that should be translated
      const textNodes: Array<{ node: Node; originalText: string }> = [];
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;

            // Skip script, style, and other non-translatable elements
            const tagName = parent.tagName.toLowerCase();
            if (['script', 'style', 'noscript', 'meta', 'head', 'title'].includes(tagName)) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip if element has data-no-translate attribute
            if (parent.hasAttribute('data-no-translate') || parent.closest('[data-no-translate]')) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip input placeholders and values (they're handled separately if needed)
            if (parent.tagName.toLowerCase() === 'input' && parent.getAttribute('type') !== 'text') {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip if text is empty or only whitespace
            const text = node.textContent?.trim();
            if (!text || text.length === 0) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip if text is a number or special character only
            if (/^[\d\s\W]+$/.test(text)) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip very short text (likely not meaningful)
            if (text.length < 2) {
              return NodeFilter.FILTER_REJECT;
            }

            // Skip if already translated (check for original text marker)
            if ((node as any).__originalText) {
              return NodeFilter.FILTER_REJECT;
            }

            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        if (text && text.length > 0) {
          // Store original text before translation
          (node as any).__originalText = text;
          textNodes.push({ node, originalText: text });
        }
      }

      if (textNodes.length === 0) {
        setIsTranslating(false);
        return;
      }

      // Batch translate texts (Google API allows up to 100 texts per request)
      const batchSize = 100;
      const batches: string[][] = [];
      
      for (let i = 0; i < textNodes.length; i += batchSize) {
        batches.push(textNodes.slice(i, i + batchSize).map(t => t.originalText));
      }

      // Translate all batches
      const allTranslations: string[] = [];
      for (const batch of batches) {
        const translations = await translateBatch(
          batch,
          getGoogleLanguageCode(targetLang),
          'en'
        );
        allTranslations.push(...translations);
      }

      // Apply translations
      textNodes.forEach(({ node }, index) => {
        if (allTranslations[index] && allTranslations[index] !== node.textContent) {
          node.textContent = allTranslations[index];
        }
      });

      // Also translate input placeholders and alt texts
      await translateAttributes(targetLang);
    } catch (error) {
      console.error('Page translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  }, [currentLang, translateAttributes, restoreOriginalContent, restoreAttributes]);

  return {
    translate,
    translatePage,
    currentLang,
    isTranslating,
    translateAttributes,
    restoreAttributes,
  };
}
