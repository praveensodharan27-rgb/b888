'use client';

interface AutoSeoContentBlockProps {
  /** Dynamic paragraph: "This {Product} is available for sale in {City}, {State}..." */
  content: string;
}

export function AutoSeoContentBlock({ content }: AutoSeoContentBlockProps) {
  if (!content?.trim()) return null;

  return (
    <section
      className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
      aria-label="About this listing"
    >
      <p className="text-gray-700 leading-relaxed" style={{ lineHeight: 1.7 }}>
        {content}
      </p>
    </section>
  );
}
