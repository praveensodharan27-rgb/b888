'use client';

/**
 * Badge for ad promotion type: TOP, Featured, Bump Up, Rent, Eco.
 * Use on ad cards and ad detail page.
 */
type PromotionType = 'TOP' | 'FEATURED' | 'BUMP_UP' | 'RENT' | 'ECO';

interface PromotionBadgeProps {
  premiumType?: PromotionType | string | null;
  expiresAt?: string | Date | null;
  className?: string;
  showCountdown?: boolean;
}

function formatCountdown(expiresAt: Date): string {
  const now = new Date();
  const diff = expiresAt.getTime() - now.getTime();
  if (diff <= 0) return 'Expired';
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  if (days > 0) return `${days}d left`;
  if (hours > 0) return `${hours}h left`;
  return '< 1h left';
}

export default function PromotionBadge({
  premiumType,
  expiresAt,
  className = '',
  showCountdown = false
}: PromotionBadgeProps) {
  if (!premiumType) return null;

  const configMap: Record<PromotionType, { label: string; bg: string; text: string }> = {
    TOP: { label: 'TOP', bg: 'bg-blue-500', text: 'text-white' },
    FEATURED: { label: 'Featured', bg: 'bg-amber-400', text: 'text-gray-900' },
    BUMP_UP: { label: 'Bump', bg: 'bg-emerald-500', text: 'text-white' },
    RENT: { label: 'Rent', bg: 'bg-indigo-500', text: 'text-white' },
    ECO: { label: 'Eco', bg: 'bg-green-500', text: 'text-white' }
  };
  const config = configMap[premiumType as PromotionType] ?? { label: String(premiumType), bg: 'bg-gray-500', text: 'text-white' };

  const endDate = expiresAt ? new Date(expiresAt) : null;
  const countdown = showCountdown && endDate ? formatCountdown(endDate) : null;

  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[12px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight shadow-sm ${config.bg} ${config.text} ${className}`}
    >
      {config.label}
      {countdown && <span className="opacity-90">· {countdown}</span>}
    </span>
  );
}
