'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import {
  FiMapPin,
  FiGlobe,
  FiPhone,
  FiMail,
  FiBriefcase,
  FiCheckCircle,
  FiSend,
  FiBookmark,
  FiBarChart2,
  FiTarget,
  FiCloud,
  FiShield,
  FiEdit2,
  FiEdit3,
  FiNavigation,
  FiStar,
  FiChevronDown,
  FiChevronUp,
  FiX,
  FiPlus,
  FiTrash2,
  FiClock,
  FiShare2,
  FiImage,
} from 'react-icons/fi';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { getBaseUrl, getApiBaseOrigin } from '@/lib/seo';

type ServiceItem = { name: string; price?: string; description?: string; image?: string };
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type DayHours = { open: string; close: string };
const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

type Business = {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  description: string | null;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  state: string | null;
  city: string;
  pincode: string | null;
  mapLocation: { lat?: number; lng?: number } | null;
  logo: string | null;
  coverImage: string | null;
  gallery: string[];
  services: ServiceItem[] | null;
  workingHours: Record<string, { open?: string; close?: string }> | null;
  socialLinks: { facebook?: string; instagram?: string; youtube?: string } | null;
  isVerified: boolean;
  isOwner?: boolean;
};

type InlineEditDraft = {
  businessName: string;
  category: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  website: string;
  address: string;
  state: string;
  city: string;
  pincode: string;
  mapLat: string;
  mapLng: string;
  logo: string;
  coverImage: string;
  gallery: string[];
  services: ServiceItem[];
  workingHours: Record<DayKey, DayHours>;
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
};

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

function businessToDraft(b: Business): InlineEditDraft {
  const wh = b.workingHours && typeof b.workingHours === 'object' ? b.workingHours : {};
  const defaultDay: DayHours = { open: '', close: '' };
  const workingHours = DAYS.reduce(
    (acc, d) => ({ ...acc, [d.key]: wh[d.key] ? { open: wh[d.key].open ?? '', close: wh[d.key].close ?? '' } : { ...defaultDay } }),
    {} as Record<DayKey, DayHours>
  );
  return {
    businessName: b.businessName || '',
    category: b.category || '',
    description: b.description || '',
    phone: b.phone || '',
    whatsapp: b.whatsapp || '',
    email: b.email || '',
    website: b.website || '',
    address: b.address || '',
    state: b.state || '',
    city: b.city || '',
    pincode: b.pincode || '',
    mapLat: b.mapLocation?.lat != null ? String(b.mapLocation.lat) : '',
    mapLng: b.mapLocation?.lng != null ? String(b.mapLocation.lng) : '',
    logo: b.logo || '',
    coverImage: b.coverImage || (b as { cover_image?: string }).cover_image || '',
    gallery: Array.isArray(b.gallery) ? b.gallery : [],
    services: Array.isArray(b.services) && b.services.length > 0 ? b.services.map((s) => ({ name: s.name ?? '', price: s.price ?? '', description: s.description ?? '', image: s.image ?? '' })) : [{ name: '', price: '', description: '', image: '' }],
    workingHours,
    socialFacebook: b.socialLinks?.facebook || '',
    socialInstagram: b.socialLinks?.instagram || '',
    socialYoutube: b.socialLinks?.youtube || '',
  };
}

function draftToPayload(draft: InlineEditDraft) {
  return {
    business_name: draft.businessName.trim(),
    category: draft.category.trim(),
    description: draft.description.trim() || undefined,
    phone: draft.phone.trim(),
    whatsapp: draft.whatsapp.trim() || undefined,
    email: draft.email.trim() || undefined,
    website: draft.website.trim() || undefined,
    address: draft.address.trim() || undefined,
    state: draft.state.trim() || undefined,
    city: draft.city.trim(),
    pincode: draft.pincode.trim() || undefined,
    map_location: draft.mapLat.trim() && draft.mapLng.trim() ? { lat: Number(draft.mapLat) || 0, lng: Number(draft.mapLng) || 0 } : null,
    logo: draft.logo.trim() || undefined,
    cover_image: draft.coverImage.trim() || undefined,
    gallery: draft.gallery.length ? draft.gallery : undefined,
    services: draft.services.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), price: s.price?.trim() || undefined, description: s.description?.trim() || undefined, image: s.image?.trim() || undefined })),
    working_hours: Object.fromEntries(DAYS.map((day) => [day.key, draft.workingHours[day.key].open || draft.workingHours[day.key].close ? draft.workingHours[day.key] : null]).filter(([, v]) => v)) as Record<string, DayHours>,
    social_links: {
      ...(draft.socialFacebook.trim() && { facebook: draft.socialFacebook.trim() }),
      ...(draft.socialInstagram.trim() && { instagram: draft.socialInstagram.trim() }),
      ...(draft.socialYoutube.trim() && { youtube: draft.socialYoutube.trim() }),
    },
  };
}

function isValidImageUrl(value: unknown): value is string {
  if (value == null || typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  if (!s.startsWith('http://') && !s.startsWith('https://')) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Resolve cover/logo/gallery URL: relative paths get API origin prepended. */
function resolveImageUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== 'string') return null;
  const s = url.trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return getApiBaseOrigin() + s;
  return getApiBaseOrigin() + '/' + s;
}

/** Convert "09:00" / "18:00" / "9:00" to "9 am" / "6 pm" */
function formatTimeTo12h(time: string): string {
  const t = time.trim();
  if (!t || /closed|^\s*$/i.test(t)) return t;
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(am|pm)?$/i);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2];
    const existing = (match[3] || '').toLowerCase();
    if (existing === 'pm' && h < 12) h += 12;
    if (existing === 'am' && h === 12) h = 0;
    if (!existing) {
      if (h === 0) h = 12;
      else if (h >= 12) {
        if (h > 12) h -= 12;
        return `${h}${m === '00' ? '' : ':' + m} pm`;
      }
      return `${h}${m === '00' ? '' : ':' + m} am`;
    }
    const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${hour}${m === '00' ? '' : ':' + m} ${h >= 12 ? 'pm' : 'am'}`;
  }
  // 24h style: 09:00, 18:00
  const m24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let h = parseInt(m24[1], 10);
    const min = m24[2];
    if (h === 0) return `12${min === '00' ? '' : ':' + min} am`;
    if (h === 12) return `12${min === '00' ? '' : ':' + min} pm`;
    if (h > 12) return `${h - 12}${min === '00' ? '' : ':' + min} pm`;
    return `${h}${min === '00' ? '' : ':' + min} am`;
  }
  return t;
}

function formatHours(h: Record<string, { open?: string; close?: string }> | null): Record<string, string> {
  if (!h || typeof h !== 'object') return {};
  const labels: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  };
  const out: Record<string, string> = {};
  Object.entries(h).forEach(([key, v]) => {
    const open = v?.open?.trim();
    const close = v?.close?.trim();
    if (open || close) {
      const openStr = open ? formatTimeTo12h(open) : '';
      const closeStr = close ? formatTimeTo12h(close) : '';
      out[labels[key] || key] = [openStr, closeStr].filter(Boolean).join(' to ');
    }
  });
  return out;
}

export default function PublicBusinessPageClient({ slug }: { slug: string }) {
  const params = useParams();
  const slugParam = (params?.slug as string) || slug;
  const queryClient = useQueryClient();
  const [expandedServiceIndex, setExpandedServiceIndex] = useState<number | null>(null);
  const [inlineDraft, setInlineDraft] = useState<InlineEditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['business', 'public', slugParam],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Business }>(`/business/public/${slugParam}`);
      return res.data.data;
    },
    enabled: !!slugParam,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center max-w-md">
          <p className="text-gray-600">Business not found or is inactive.</p>
          <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  const b = data;
  const rawCover = (b as { cover_image?: string | null }).cover_image ?? b.coverImage;
  const coverImageUrl = resolveImageUrl(rawCover);
  const hoursFormatted = formatHours(b.workingHours);
  const servicesList = Array.isArray(b.services) ? b.services : [];
  const mapUrl =
    b.mapLocation?.lat != null && b.mapLocation?.lng != null
      ? `https://www.google.com/maps?q=${b.mapLocation.lat},${b.mapLocation.lng}`
      : b.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([b.address, b.city, b.state].filter(Boolean).join(', '))}`
        : null;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: b.businessName,
    description: b.description || `${b.category} in ${b.city}`,
    url: `${getBaseUrl()}/business/${b.slug}`,
    telephone: b.phone || undefined,
    email: b.email || undefined,
    address:
      b.address || b.city
        ? {
            '@type': 'PostalAddress',
            streetAddress: b.address || undefined,
            addressLocality: b.city || undefined,
            addressRegion: b.state || undefined,
            postalCode: b.pincode || undefined,
          }
        : undefined,
    geo:
      b.mapLocation?.lat != null && b.mapLocation?.lng != null
        ? { '@type': 'GeoCoordinates', latitude: b.mapLocation.lat, longitude: b.mapLocation.lng }
        : undefined,
    image: (isValidImageUrl(coverImageUrl) && coverImageUrl) || (isValidImageUrl(resolveImageUrl(b.logo)) && resolveImageUrl(b.logo)) || undefined,
    openingHoursSpecification: b.workingHours && typeof b.workingHours === 'object'
      ? Object.entries(b.workingHours)
          .filter(([, v]) => v?.open || v?.close)
          .map(([day, v]) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: day.charAt(0).toUpperCase() + day.slice(1),
            opens: v?.open?.trim() || undefined,
            closes: v?.close?.trim() || undefined,
          }))
      : [{ '@type': 'OpeningHoursSpecification', dayOfWeek: 'Monday', opens: '09:00', closes: '18:00' }],
  };

  const cardClass = 'rounded-[20px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-shadow duration-200 hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)]';
  const sectionTitleClass = 'border-l-4 border-blue-500 pl-3 text-lg font-bold text-gray-900';

  const isOwner = !!(b as { isOwner?: boolean }).isOwner;

  const handleStartEdit = () => setInlineDraft(businessToDraft(b));
  const handleCancelEdit = () => setInlineDraft(null);
  const handleSaveEdit = async () => {
    if (!inlineDraft || !b.id || saving) return;
    const valid = inlineDraft.businessName.trim() && inlineDraft.category.trim() && inlineDraft.phone.trim() && inlineDraft.city.trim();
    if (!valid) {
      toast.error('Please fill required fields: Business name, Category, Phone, City');
      return;
    }
    setSaving(true);
    try {
      await api.put(`/business/${b.id}`, draftToPayload(inlineDraft));
      toast.success('Business updated');
      await queryClient.invalidateQueries({ queryKey: ['business', 'public', slugParam] });
      setInlineDraft(null);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Update failed';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateDraft = (updates: Partial<InlineEditDraft>) => {
    setInlineDraft((prev) => (prev ? { ...prev, ...updates } : null));
  };
  const updateService = (index: number, field: keyof ServiceItem, value: string) => {
    setInlineDraft((prev) => {
      if (!prev) return null;
      const next = prev.services.map((s, i) => (i === index ? { ...s, [field]: value } : s));
      return { ...prev, services: next };
    });
  };
  const addService = () => setInlineDraft((prev) => prev ? { ...prev, services: [...prev.services, { name: '', price: '', description: '', image: '' }] } : null);
  const removeService = (i: number) => setInlineDraft((prev) => prev ? { ...prev, services: prev.services.filter((_, idx) => idx !== i) } : null);
  const updateWorkingHours = (day: DayKey, field: 'open' | 'close', value: string) => {
    setInlineDraft((prev) => {
      if (!prev) return null;
      return { ...prev, workingHours: { ...prev.workingHours, [day]: { ...prev.workingHours[day], [field]: value } } };
    });
  };
  const addGalleryUrl = (url: string) => url.trim() && setInlineDraft((prev) => prev && prev.gallery.length < 20 ? { ...prev, gallery: [...prev.gallery, url.trim()] } : null);
  const removeGallery = (i: number) => setInlineDraft((prev) => prev ? { ...prev, gallery: prev.gallery.filter((_, idx) => idx !== i) } : null);

  return (
    <div className="min-h-screen bg-[#f6f8fb] font-sans antialiased">
      {/* Owner: edit pencil in header – click to enable inline edit */}
      {isOwner && (
        <div className="sticky top-0 z-30 flex items-center justify-end gap-2 border-b border-gray-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur">
          {inlineDraft ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FiX className="h-4 w-4" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleStartEdit}
              className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
              aria-label="Edit business"
            >
              <FiEdit3 className="h-4 w-4" /> Edit
            </button>
          )}
        </div>
      )}

      {inlineDraft ? (
        /* Inline edit form – same page */
        <div className="mx-auto max-w-2xl px-4 py-6">
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-blue-800">
            You’re editing your business page. Changes are saved when you click Save.
          </div>
          <div className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><FiBriefcase className="h-5 w-5" /> Basic info</h2>
              <div className="space-y-3">
                <div><label className={labelClass}>Business name *</label><input type="text" className={inputClass} value={inlineDraft.businessName} onChange={(e) => updateDraft({ businessName: e.target.value })} required /></div>
                <div><label className={labelClass}>Category *</label><input type="text" className={inputClass} value={inlineDraft.category} onChange={(e) => updateDraft({ category: e.target.value })} required /></div>
                <div><label className={labelClass}>Description</label><textarea className={inputClass + ' min-h-[80px]'} value={inlineDraft.description} onChange={(e) => updateDraft({ description: e.target.value })} rows={3} /></div>
              </div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><FiPhone className="h-5 w-5" /> Contact</h2>
              <div className="space-y-3">
                <div><label className={labelClass}>Phone *</label><input type="tel" className={inputClass} value={inlineDraft.phone} onChange={(e) => updateDraft({ phone: e.target.value })} /></div>
                <div><label className={labelClass}>WhatsApp</label><input type="tel" className={inputClass} value={inlineDraft.whatsapp} onChange={(e) => updateDraft({ whatsapp: e.target.value })} /></div>
                <div><label className={labelClass}>Email</label><input type="email" className={inputClass} value={inlineDraft.email} onChange={(e) => updateDraft({ email: e.target.value })} /></div>
                <div><label className={labelClass}>Website</label><input type="url" className={inputClass} value={inlineDraft.website} onChange={(e) => updateDraft({ website: e.target.value })} placeholder="https://..." /></div>
              </div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><FiMapPin className="h-5 w-5" /> Location</h2>
              <div className="space-y-3">
                <div><label className={labelClass}>Address</label><textarea className={inputClass} value={inlineDraft.address} onChange={(e) => updateDraft({ address: e.target.value })} rows={2} /></div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div><label className={labelClass}>State</label><input type="text" className={inputClass} value={inlineDraft.state} onChange={(e) => updateDraft({ state: e.target.value })} /></div>
                  <div><label className={labelClass}>City *</label><input type="text" className={inputClass} value={inlineDraft.city} onChange={(e) => updateDraft({ city: e.target.value })} required /></div>
                  <div><label className={labelClass}>Pincode</label><input type="text" className={inputClass} value={inlineDraft.pincode} onChange={(e) => updateDraft({ pincode: e.target.value })} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className={labelClass}>Map lat</label><input type="text" className={inputClass} value={inlineDraft.mapLat} onChange={(e) => updateDraft({ mapLat: e.target.value })} placeholder="e.g. 28.6139" /></div>
                  <div><label className={labelClass}>Map lng</label><input type="text" className={inputClass} value={inlineDraft.mapLng} onChange={(e) => updateDraft({ mapLng: e.target.value })} placeholder="e.g. 77.209" /></div>
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><FiImage className="h-5 w-5" /> Images</h2>
              <div className="space-y-3">
                <div><label className={labelClass}>Logo URL</label><input type="url" className={inputClass} value={inlineDraft.logo} onChange={(e) => updateDraft({ logo: e.target.value })} placeholder="https://..." /></div>
                <div><label className={labelClass}>Cover image URL</label><input type="url" className={inputClass} value={inlineDraft.coverImage} onChange={(e) => updateDraft({ coverImage: e.target.value })} placeholder="https://..." /></div>
                <div>
                  <label className={labelClass}>Gallery (paste URL and press Enter)</label>
                  <input
                    type="url"
                    className={inputClass + ' mb-2'}
                    placeholder="https://..."
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addGalleryUrl((e.target as HTMLInputElement).value); (e.target as HTMLInputElement).value = ''; } }}
                  />
                  {inlineDraft.gallery.length > 0 && (
                    <div className="grid grid-cols-4 gap-2">
                      {inlineDraft.gallery.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                          <Image src={url} alt={`${inlineDraft.businessName} gallery image ${i + 1}`} fill className="object-cover" sizes="80px" />
                          <button type="button" onClick={() => removeGallery(i)} className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white" aria-label="Remove"><FiTrash2 className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><FiBriefcase className="h-5 w-5" /> Services</h2>
              <div className="space-y-3">
                {inlineDraft.services.map((s, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                    <div className="mb-2 flex justify-between"><span className="text-sm text-gray-600">Service {i + 1}</span><button type="button" onClick={() => removeService(i)} disabled={inlineDraft.services.length <= 1} className="text-red-600 hover:underline"><FiTrash2 className="h-4 w-4" /></button></div>
                    <input type="text" className={inputClass + ' mb-2'} value={s.name} onChange={(e) => updateService(i, 'name', e.target.value)} placeholder="Name" />
                    <input type="text" className={inputClass + ' mb-2'} value={s.price} onChange={(e) => updateService(i, 'price', e.target.value)} placeholder="Price" />
                    <textarea className={inputClass + ' mb-2'} value={s.description} onChange={(e) => updateService(i, 'description', e.target.value)} placeholder="Description" rows={2} />
                    <input type="url" className={inputClass} value={s.image} onChange={(e) => updateService(i, 'image', e.target.value)} placeholder="Image URL" />
                  </div>
                ))}
                <button type="button" onClick={addService} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"><FiPlus className="h-4 w-4" /> Add service</button>
              </div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><FiClock className="h-5 w-5" /> Working hours</h2>
              <div className="space-y-2">
                {DAYS.map((day) => (
                  <div key={day.key} className="flex flex-wrap items-center gap-2">
                    <span className="w-24 text-sm text-gray-700">{day.label}</span>
                    <input type="text" className={inputClass + ' w-24'} value={inlineDraft.workingHours[day.key].open} onChange={(e) => updateWorkingHours(day.key, 'open', e.target.value)} placeholder="9:00" />
                    <span className="text-gray-400">–</span>
                    <input type="text" className={inputClass + ' w-24'} value={inlineDraft.workingHours[day.key].close} onChange={(e) => updateWorkingHours(day.key, 'close', e.target.value)} placeholder="18:00" />
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border border-gray-200 bg-white p-4">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900"><FiShare2 className="h-5 w-5" /> Social</h2>
              <div className="space-y-3">
                <div><label className={labelClass}>Facebook</label><input type="url" className={inputClass} value={inlineDraft.socialFacebook} onChange={(e) => updateDraft({ socialFacebook: e.target.value })} /></div>
                <div><label className={labelClass}>Instagram</label><input type="url" className={inputClass} value={inlineDraft.socialInstagram} onChange={(e) => updateDraft({ socialInstagram: e.target.value })} /></div>
                <div><label className={labelClass}>YouTube</label><input type="url" className={inputClass} value={inlineDraft.socialYoutube} onChange={(e) => updateDraft({ socialYoutube: e.target.value })} /></div>
              </div>
            </section>
          </div>
        </div>
      ) : (
        <div className="contents">
      <Script
        id="business-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        strategy="afterInteractive"
      />

      {/* Banner / Cover image – full width */}
      <div className="relative h-56 w-full min-h-[14rem] sm:h-72 md:h-80 overflow-hidden">
        {isValidImageUrl(coverImageUrl) ? (
          <>
            <Image
              src={coverImageUrl}
              alt={`${b.businessName} cover`}
              fill
              className="object-cover object-center"
              sizes="100vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#f6f8fb]/95 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800" />
        )}
      </div>

      <div className="mx-auto max-w-[1200px] px-4 py-8">
        {/* Top Header Card */}
        <div className={`${cardClass} mb-8 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between`}>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {isValidImageUrl(resolveImageUrl(b.logo)) ? (
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gray-100 sm:h-24 sm:w-24">
                <Image src={resolveImageUrl(b.logo)!} alt={`${b.businessName} logo`} fill className="object-cover" sizes="96px" />
              </div>
            ) : (
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500 sm:h-24 sm:w-24">
                <FiBriefcase className="h-10 w-10" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">{b.businessName}</h1>
                {b.isVerified && (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white" aria-label="Verified">
                    <FiCheckCircle className="h-4 w-4" />
                  </span>
                )}
                <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">Enterprise</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <FiBriefcase className="h-4 w-4 text-gray-400" />
                  {b.category}
                </span>
                <span className="flex items-center gap-1.5">
                  <FiStar className="h-4 w-4 fill-amber-400 text-amber-400" />
                  4.9 (128 reviews)
                </span>
                {b.city && (
                  <span className="flex items-center gap-1.5">
                    <FiMapPin className="h-4 w-4 text-gray-400" />
                    {[b.city, b.state].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            <a
              href={b.phone ? `tel:${b.phone.replace(/\s/g, '')}` : b.email ? `mailto:${b.email}` : '#'}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-md hover:from-blue-700 hover:to-blue-600 transition-all"
            >
              <FiSend className="h-4 w-4" /> Contact Business
            </a>
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors"
            >
              <FiBookmark className="h-4 w-4" /> Save
            </button>
          </div>
        </div>

        {/* Main grid: 70% left, 30% right */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-10">
          <div className="lg:col-span-7 space-y-6">
            {/* About the Company */}
            {b.description && (
              <section className={cardClass}>
                <h2 className={sectionTitleClass}>About the Company</h2>
                <p className="mt-4 leading-relaxed text-gray-600" style={{ lineHeight: 1.75 }}>
                  {b.description}
                </p>
              </section>
            )}

            {/* Our Core Services – 2 lines by default, click to expand full */}
            {servicesList.length > 0 && (
              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Our Core Services</h2>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {servicesList.map((s, i) => {
                    const icons = [FiBarChart2, FiTarget, FiCloud, FiShield];
                    const Icon = icons[i % icons.length];
                    const isExpanded = expandedServiceIndex === i;
                    const hasDescription = !!s.description?.trim();
                    const toggle = () => setExpandedServiceIndex(isExpanded ? null : i);
                    return (
                      <button
                        type="button"
                        key={i}
                        onClick={toggle}
                        className="w-full rounded-xl bg-gray-50/80 p-4 text-left transition-shadow hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                      >
                        {isValidImageUrl(s.image) ? (
                          <div className="relative mb-3 h-12 w-12 overflow-hidden rounded-lg bg-white">
                            <Image src={s.image} alt={s.name || 'Service'} fill className="object-cover" sizes="48px" />
                          </div>
                        ) : (
                          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                            <Icon className="h-6 w-6 text-blue-600" aria-hidden />
                          </div>
                        )}
                        <h3 className="font-semibold text-gray-900">{s.name}</h3>
                        {s.price && <p className="mt-0.5 text-sm font-medium text-blue-600">{s.price}</p>}
                        {s.description && (
                          <p
                            className={`mt-1 text-sm leading-snug text-gray-600 ${!isExpanded ? 'line-clamp-2' : ''}`}
                          >
                            {s.description}
                          </p>
                        )}
                        {hasDescription && (
                          <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600">
                            {isExpanded ? (
                              <>Show less <FiChevronUp className="h-3.5 w-3.5" /></>
                            ) : (
                              <>Read more <FiChevronDown className="h-3.5 w-3.5" /></>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Gallery */}
            {b.gallery && b.gallery.filter(isValidImageUrl).length > 0 && (
              <section className={cardClass}>
                <h2 className={sectionTitleClass}>Gallery</h2>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {b.gallery.filter(isValidImageUrl).slice(0, 9).map((url, i) => (
                    <div key={i} className="relative aspect-square overflow-hidden rounded-xl bg-gray-100">
                      <Image src={url} alt={`${b.businessName} gallery image ${i + 1}`} fill className="object-cover" sizes="(max-width:640px) 50vw, 33vw" />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Client Reviews */}
            <section className={cardClass}>
              <div className="flex items-center justify-between">
                <h2 className={sectionTitleClass}>Client Reviews</h2>
                <button type="button" className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline">
                  <FiEdit2 className="h-4 w-4" /> Write a Review
                </button>
              </div>
              <div className="mt-6">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                    JD
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">James Donovan</p>
                        <p className="text-sm text-gray-500">CEO, APEX LOGISTICS</p>
                      </div>
                      <span className="text-xs text-gray-400">2 weeks ago</span>
                    </div>
                    <div className="mt-2 flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FiStar key={star} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      Nexus transformed our supply chain visibility. Their team was professional, responsive, and truly understood our industry&apos;s unique challenges. Highly recommended for any large-scale modernization projects.
                    </p>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="mt-6 w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Load more reviews
              </button>
            </section>
          </div>

          {/* Right column – 30% */}
          <div className="space-y-6 lg:col-span-3 lg:sticky lg:top-8">
            {/* Connect with Us */}
            <div className={cardClass}>
              <h3 className="text-base font-bold text-gray-900">Connect with Us</h3>
              <div className="mt-4 space-y-4">
                {b.website && typeof b.website === 'string' && b.website.trim() && (
                  <div className="flex items-start gap-3">
                    <FiGlobe className="h-5 w-5 shrink-0 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Website</p>
                      <a
                        href={b.website.startsWith('http') ? b.website : `https://${b.website.trim()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-900 font-semibold hover:underline mt-0.5 block"
                      >
                        {String(b.website).replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      </a>
                    </div>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-start gap-3">
                    <FiPhone className="h-5 w-5 shrink-0 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Phone</p>
                      <a href={`tel:${b.phone.replace(/\s/g, '')}`} className="text-gray-900 font-semibold mt-0.5 block">{b.phone}</a>
                    </div>
                  </div>
                )}
                {b.email && (
                  <div className="flex items-start gap-3">
                    <FiMail className="h-5 w-5 shrink-0 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Email</p>
                      <a href={`mailto:${b.email}`} className="text-gray-900 font-semibold truncate block max-w-[200px] mt-0.5">{b.email}</a>
                    </div>
                  </div>
                )}
                {b.whatsapp && (
                  <div className="flex items-start gap-3">
                    <FiPhone className="h-5 w-5 shrink-0 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-gray-400">WhatsApp</p>
                      <a
                        href={`https://wa.me/${b.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-900 font-semibold mt-0.5 block"
                      >
                        {b.whatsapp}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Hours – default 9 am to 6 pm when none set */}
            {(() => {
              const hasHours = Object.keys(hoursFormatted).length > 0;
              const defaultHours: Record<string, string> = hasHours
                ? hoursFormatted
                : {
                    Monday: '9 am to 6 pm',
                    Tuesday: '9 am to 6 pm',
                    Wednesday: '9 am to 6 pm',
                    Thursday: '9 am to 6 pm',
                    Friday: '9 am to 6 pm',
                    Saturday: '9 am to 6 pm',
                    Sunday: '9 am to 6 pm',
                  };
              return (
                <div className={cardClass}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900">Business Hours</h3>
                    {hasHours && (
                      <span className="rounded-md bg-green-100 px-2.5 py-1 text-xs font-medium text-green-800">OPEN NOW</span>
                    )}
                  </div>
                  <ul className="mt-4 space-y-2 text-sm">
                    {Object.entries(defaultHours).map(([day, time]) => {
                      const isClosed = /closed|^\s*$/i.test(time);
                      return (
                        <li key={day} className="flex justify-between gap-2">
                          <span className={isClosed ? 'italic text-gray-400' : 'text-gray-900'}>{day}</span>
                          <span className={isClosed ? 'italic text-gray-400' : 'text-gray-700'}>{time}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })()}

            {/* Location */}
            <div className={`${cardClass} overflow-hidden`}>
              <h3 className="text-base font-bold text-gray-900">Location</h3>
              {(b.address || b.city) && (
                <p className="mt-2 text-sm leading-snug text-gray-900">
                  {b.address}
                  {[b.city, b.state, b.pincode].filter(Boolean).length > 0 && (
                    <span className="block mt-0.5">{[b.city, b.state, b.pincode].filter(Boolean).join(', ')}</span>
                  )}
                  {!b.address && b.city && [b.city, b.state, b.pincode].filter(Boolean).join(', ')}
                </p>
              )}
              <div className="mt-4 relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                <FiMapPin className="h-10 w-10 text-blue-600" />
                {mapUrl && (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 shadow-sm hover:bg-gray-50"
                  >
                    <FiNavigation className="h-4 w-4" /> Get Directions
                  </a>
                )} 
              </div>
            </div>

            {/* Social links */}
            {(b.socialLinks?.facebook || b.socialLinks?.instagram || b.socialLinks?.youtube) && (
              <div className={cardClass}>
                <h3 className="text-base font-bold text-gray-900">Follow</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {b.socialLinks.facebook && (
                    <a
                      href={b.socialLinks.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      aria-label="Facebook"
                    >
                      Facebook
                    </a>
                  )}
                  {b.socialLinks.instagram && (
                    <a
                      href={b.socialLinks.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      aria-label="Instagram"
                    >
                      Instagram
                    </a>
                  )}
                  {b.socialLinks.youtube && (
                    <a
                      href={b.socialLinks.youtube}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      aria-label="YouTube"
                    >
                      YouTube
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-gray-200 pt-8 text-center">
          <p className="text-base font-semibold text-blue-600">Sell Box</p>
          <p className="mt-2 text-sm text-gray-500">
            ©{new Date().getFullYear()} Sell Box. Business information is verified for professional accuracy and compliance standards.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            <Link
              href="/mybusiness"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
            >
              List your business
            </Link>
            <span className="text-gray-400">|</span>
            <Link href="/terms" className="text-blue-600 hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            <Link href="/contact" className="text-blue-600 hover:underline">Contact Support</Link>
          </div>
        </footer>
      </div>
        </div>
      )}
    </div>
  );
}
