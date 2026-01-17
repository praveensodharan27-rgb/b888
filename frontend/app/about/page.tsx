'use client';

import Link from 'next/link';
import { FiCompass, FiShield, FiTarget } from 'react-icons/fi';

export default function AboutPage() {
  type LeaderVariant = 'teal' | 'mint' | 'slate' | 'amber';

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    const first = parts[0]?.[0] || '';
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] || '') : '';
    return (first + last).toUpperCase();
  };

  const SvgAvatar = ({ name, variant }: { name: string; variant: LeaderVariant }) => {
    const initials = getInitials(name);
    const gradientId = `grad-${variant}-${initials || 'xx'}`;
    const colors =
      variant === 'teal'
        ? ['#14B8A6', '#0EA5E9']
        : variant === 'mint'
          ? ['#22C55E', '#06B6D4']
          : variant === 'amber'
            ? ['#F59E0B', '#FB7185']
            : ['#64748B', '#94A3B8'];

    return (
      <svg viewBox="0 0 80 80" width="80" height="80" role="img" aria-label={name}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={colors[0]} />
            <stop offset="1" stopColor={colors[1]} />
          </linearGradient>
        </defs>
        <circle cx="40" cy="40" r="40" fill={`url(#${gradientId})`} />
        <circle cx="40" cy="32" r="14" fill="rgba(255,255,255,0.9)" />
        <path
          d="M16 74c5.5-14.5 18-22 24-22s18.5 7.5 24 22"
          fill="rgba(255,255,255,0.9)"
        />
        <text
          x="40"
          y="44"
          textAnchor="middle"
          fontSize="18"
          fontWeight="800"
          fill="rgba(15,23,42,0.8)"
          fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
        >
          {initials}
        </text>
      </svg>
    );
  };

  const MarketplaceIllustration = () => (
    <svg viewBox="0 0 900 600" className="h-full w-full" role="img" aria-label="Trust and safety illustration">
      <defs>
        <linearGradient id="shieldFill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A7F3FF" />
          <stop offset="1" stopColor="#7DD3FC" />
        </linearGradient>
        <linearGradient id="shieldStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#0284C7" />
        </linearGradient>
        <filter id="drop" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="18" result="b" />
          <feColorMatrix
            in="b"
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.22 0"
            result="s"
          />
          <feMerge>
            <feMergeNode in="s" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="0" y="0" width="900" height="600" fill="#F8FAFC" />
      <g opacity="0.7">
        <circle cx="120" cy="120" r="70" fill="#E0F2FE" />
        <circle cx="820" cy="110" r="60" fill="#E0F2FE" />
        <circle cx="140" cy="520" r="90" fill="#E0F2FE" />
        <circle cx="820" cy="520" r="90" fill="#E0F2FE" />
      </g>

      {/* Shield */}
      <g filter="url(#drop)">
        <path
          d="M450 85
             C365 125 285 125 255 140
             C240 270 270 385 450 515
             C630 385 660 270 645 140
             C615 125 535 125 450 85Z"
          fill="url(#shieldFill)"
          stroke="url(#shieldStroke)"
          strokeWidth="22"
          strokeLinejoin="round"
        />

        {/* Check mark */}
        <path
          d="M380 205 430 255 535 150"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="26"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Handshake */}
        <g transform="translate(0,20)">
          <path
            d="M280 300
               L355 250
               C372 238 396 238 412 251
               L450 281
               L488 251
               C504 238 528 238 545 250
               L620 300
               L590 345
               C572 372 533 378 508 359
               L470 330
               L450 345
               L430 330
               L392 359
               C367 378 328 372 310 345Z"
            fill="#FFFFFF"
            opacity="0.98"
          />
          <path
            d="M450 330
               L465 318
               C480 306 501 306 516 318"
            fill="none"
            stroke="#7DD3FC"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M450 330
               L435 318
               C420 306 399 306 384 318"
            fill="none"
            stroke="#7DD3FC"
            strokeWidth="10"
            strokeLinecap="round"
          />
          <path
            d="M280 300
               L245 335
               L305 395
               L340 360Z"
            fill="#FFFFFF"
          />
          <path
            d="M620 300
               L655 335
               L595 395
               L560 360Z"
            fill="#FFFFFF"
          />
        </g>
      </g>

      <text
        x="450"
        y="565"
        textAnchor="middle"
        fontSize="28"
        fontWeight="800"
        fill="#0F172A"
        fontFamily="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
      >
        Trust • Safety • Community
      </text>
    </svg>
  );

  const pillars = [
    {
      title: 'Our Mission',
      description: 'To democratize local trade by providing a simple, safe, and efficient platform for every neighbor.',
      icon: FiTarget,
    },
    {
      title: 'Our Vision',
      description: 'To be the global benchmark for sustainable consumption through trusted peer-to-peer marketplaces.',
      icon: FiCompass,
    },
    {
      title: 'Our Values',
      description: 'Safety first, absolute transparency, and a relentless focus on community satisfaction in every deal.',
      icon: FiShield,
    },
  ];

  const leaders = [
    {
      name: 'Pranav',
      role: 'Founder & CEO',
      variant: 'teal',
      imageUrl: 'https://i.pravatar.cc/160?img=12',
    },
    {
      name: 'Nimisha KS',
      role: 'Head of Engineering',
      variant: 'mint',
      imageUrl: 'https://i.pravatar.cc/160?img=47',
    },
    {
      name: 'Arjun Nair',
      role: 'Trust & Safety Lead',
      variant: 'slate',
      imageUrl: 'https://i.pravatar.cc/160?img=32',
    },
    {
      name: 'Meera Joseph',
      role: 'Community Director',
      variant: 'amber',
      imageUrl: 'https://i.pravatar.cc/160?img=5',
    },
  ] as const;

  const avatarVariant = (variant: LeaderVariant) => {
    switch (variant) {
      case 'teal':
        return 'ring-teal-100 bg-teal-50';
      case 'mint':
        return 'ring-emerald-100 bg-emerald-50';
      case 'slate':
        return 'ring-slate-200 bg-slate-100';
      case 'amber':
        return 'ring-amber-100 bg-amber-50';
      default:
        return 'ring-slate-200 bg-slate-100';
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" />
        <div className="relative mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center text-white">
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">About Our Marketplace</h1>
            <p className="mt-4 text-sm leading-6 text-blue-100 sm:text-base">
              Connecting millions of buyers and sellers worldwide to make local trade easy, accessible, and sustainable for everyone.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#vision"
                className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Our Vision
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
              >
                Join Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-gray-900">Core Pillars</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600">
              Our foundation is built on trust, community, and the simple joy of finding what you need locally.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-gray-900" id={p.title === 'Our Vision' ? 'vision' : undefined}>
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{p.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900">Our Story</h2>
              <div className="mt-5 space-y-4 text-sm leading-6 text-gray-600">
                <p>
                  It all started in a small garage in 2014. Our founders realized that while the world was becoming more connected
                  digitally, people were losing the ability to trade easily with those right in their own neighborhoods.
                </p>
                <p>
                  We built a simple website to help people sell things they no longer needed. Within months, we saw thousands of people
                  finding new homes for furniture, electronics, and even vintage collections.
                </p>
                <p>
                  Today, Marketplace is more than just a site; it&apos;s a movement towards more sustainable living. By giving items a second
                  life, our community helps reduce waste while saving money. We&apos;ve grown from a local project to a global family, but our
                  heart remains right next door.
                </p>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-6">
                <div>
                  <div className="text-2xl font-extrabold text-blue-600">10M+</div>
                  <div className="mt-1 text-[11px] font-semibold tracking-widest text-gray-500">ACTIVE USERS</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-blue-600">50M+</div>
                  <div className="mt-1 text-[11px] font-semibold tracking-widest text-gray-500">ITEMS TRADED</div>
                </div>
                <div>
                  <div className="text-2xl font-extrabold text-blue-600">120+</div>
                  <div className="mt-1 text-[11px] font-semibold tracking-widest text-gray-500">CITIES COVERED</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl shadow-xl bg-gray-100">
                <div className="h-[260px] w-full sm:h-[320px]">
                  <MarketplaceIllustration />
                </div>

                {/* Small supporting image card */}
                <div className="absolute bottom-4 right-4 w-40 overflow-hidden rounded-xl border border-white/50 bg-white shadow-lg sm:bottom-6 sm:right-6 sm:w-48">
                  <div className="h-28 w-full bg-gradient-to-br from-slate-900 via-blue-700 to-emerald-600 sm:h-32">
                    <svg viewBox="0 0 240 160" className="h-full w-full" role="img" aria-label="Items illustration">
                      <g fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M55 95h55v45H55z" />
                        <path d="M72 95V75a18 18 0 0 1 18-18h2a18 18 0 0 1 18 18v20" />
                        <path d="M140 68h58v72h-58z" />
                        <path d="M150 82h38" opacity="0.7" />
                        <path d="M150 102h38" opacity="0.7" />
                        <path d="M150 122h26" opacity="0.7" />
                      </g>
                    </svg>
                  </div>
                  <div className="px-3 py-2">
                    <div className="text-xs font-semibold text-gray-900">Built for trust</div>
                    <div className="mt-0.5 text-[11px] text-gray-600">A safer way to buy &amp; sell locally.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Leaders */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Meet the Leaders</h2>
            <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600">
              The passionate individuals behind our platform&apos;s success and safety.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-8 md:grid-cols-4">
            {leaders.map((l) => (
              <div key={l.name} className="text-center">
                <div
                  className={[
                    'mx-auto h-20 w-20 overflow-hidden rounded-full ring-8',
                    avatarVariant(l.variant),
                  ].join(' ')}
                >
                  <SvgAvatar name={l.name} variant={l.variant} />
                </div>
                <div className="mt-3 text-sm font-bold text-gray-900">{l.name}</div>
                <div className="mt-1 text-xs text-blue-600">{l.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 px-8 py-12 text-center text-white shadow-lg">
            <div className="pointer-events-none absolute -left-10 -bottom-16 h-56 w-56 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-white/10" />
            <h3 className="text-3xl font-extrabold leading-tight sm:text-4xl">
              Ready to join our growing
              <br />
              community?
            </h3>
            <p className="mx-auto mt-4 max-w-2xl text-sm text-blue-100">
              Whether you&apos;re looking to declutter or finding your next treasure, we&apos;re here to help.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/post-ad"
                className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
              >
                Start Selling
              </Link>
              <Link
                href="/ads"
                className="inline-flex items-center justify-center rounded-md border border-white/40 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/15"
              >
                Browse Items
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

