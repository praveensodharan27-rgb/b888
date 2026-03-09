'use client';

interface BusinessMapEmbedProps {
  lat: number | null | undefined;
  lng: number | null | undefined;
  address?: string | null;
  className?: string;
}

/** Static embed of business location (Google Maps iframe). */
export function BusinessMapEmbed({ lat, lng, address, className = '' }: BusinessMapEmbedProps) {
  const hasCoords = typeof lat === 'number' && typeof lng === 'number';
  const query = hasCoords ? `${lat},${lng}` : (address || '').replace(/\s+/g, '+');
  if (!query) {
    return (
      <div className={`flex aspect-video items-center justify-center rounded-xl border border-gray-200 bg-gray-100 text-gray-500 ${className}`}>
        <span className="text-sm">No location set</span>
      </div>
    );
  }
  const embedUrl = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
  return (
    <iframe
      src={embedUrl}
      width="100%"
      height="100%"
      style={{ border: 0, minHeight: 200 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title="Business location"
      className={`rounded-xl ${className}`}
    />
  );
}
