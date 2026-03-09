'use client';

import { useState } from 'react';
import { FiFileText, FiChevronDown, FiChevronUp } from 'react-icons/fi';

interface DescriptionBlockProps {
  description: string;
  /** Auto-generated keyword-rich paragraph (used product, price in state, second hand) */
  keywordRichParagraph?: string | null;
  /** Auto SEO content block - shown when description is short or as addition */
  autoSeoContent?: string | null;
  /** Character limit before collapsing (default 400) */
  collapseThreshold?: number;
  /** If description < this, auto-expand with SEO content (default 100) */
  expandIfShorterThan?: number;
}

export function DescriptionBlock({
  description,
  keywordRichParagraph,
  autoSeoContent,
  collapseThreshold = 400,
  expandIfShorterThan = 100,
}: DescriptionBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const text = (description || '').trim();

  // Fallback: if description too short, use keyword-rich + auto SEO content
  const useSeoFallback = text.length < expandIfShorterThan && (keywordRichParagraph || autoSeoContent);
  const displayContent = useSeoFallback
    ? [keywordRichParagraph, autoSeoContent].filter(Boolean).join('\n\n')
    : text;

  if (!displayContent) return null;

  const needsCollapse = displayContent.length > collapseThreshold && !useSeoFallback;
  const displayedText =
    needsCollapse && !expanded
      ? displayContent.slice(0, collapseThreshold).trim()
      : displayContent;
  const hasMore = needsCollapse && !expanded;

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
        <FiFileText className="w-5 h-5 text-primary-600" />
        Description
      </h2>
      <div
        className="text-gray-700 leading-relaxed whitespace-pre-wrap"
        style={{ lineHeight: 1.7 }}
      >
        {displayedText}
        {hasMore && '…'}
      </div>
      {needsCollapse && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 text-primary-600 font-semibold hover:text-primary-700 text-sm"
        >
          {expanded ? (
            <>
              <FiChevronUp className="w-4 h-4" />
              Read less
            </>
          ) : (
            <>
              <FiChevronDown className="w-4 h-4" />
              Read more
            </>
          )}
        </button>
      )}
    </section>
  );
}
