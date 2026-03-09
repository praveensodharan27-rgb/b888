'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import toast from '@/lib/toast';
import {
  FiArrowLeft,
  FiPlus,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiBriefcase,
  FiPhone,
  FiMapPin,
  FiImage,
  FiClock,
  FiShare2,
  FiUpload,
  FiCheck,
  FiLock,
} from 'react-icons/fi';

const DRAFT_KEY = 'business_create_draft';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

type ServiceItem = { name: string; price: string; description: string; image: string };
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type DayHours = { open: string; close: string };
type WorkingHoursMap = Record<DayKey, DayHours>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

function getInitialWorkingHours(): WorkingHoursMap {
  return DAYS.reduce(
    (acc, d) => ({ ...acc, [d.key]: { open: '', close: '' } }),
    {} as WorkingHoursMap
  );
}

function Section({
  id,
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-gray-200/80 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3.5 text-left transition-colors hover:bg-gray-50/80"
      >
        <span className="flex items-center gap-2.5 font-medium text-gray-900">
          <Icon className="h-5 w-5 text-blue-600" />
          {title}
        </span>
        {open ? <FiChevronUp className="h-5 w-5 text-gray-400" /> : <FiChevronDown className="h-5 w-5 text-gray-400" />}
      </button>
      {open && <div className="border-t border-gray-100 bg-gray-50/30 px-4 py-4">{children}</div>}
    </div>
  );
}

export default function CompleteBusinessPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [openSection, setOpenSection] = useState<string>('contact');
  const [draft, setDraft] = useState<{
    businessName: string;
    category: string;
    tradingName?: string;
    website: string;
    phone: string;
    city: string;
  } | null>(null);
  const [ready, setReady] = useState(false);

  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [address, setAddress] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [mapLat, setMapLat] = useState('');
  const [mapLng, setMapLng] = useState('');
  const [logo, setLogo] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [gallery, setGallery] = useState<string[]>([]);
  const [galleryUrl, setGalleryUrl] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([{ name: '', price: '', description: '', image: '' }]);
  const [workingHours, setWorkingHours] = useState<WorkingHoursMap>(getInitialWorkingHours());
  const [socialFacebook, setSocialFacebook] = useState('');
  const [socialInstagram, setSocialInstagram] = useState('');
  const [socialYoutube, setSocialYoutube] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || ready) return;
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && parsed.businessName && parsed.category && parsed.phone && parsed.city) {
        setDraft(parsed);
        if (parsed.city) setCity(parsed.city);
      } else {
        router.replace('/mybusiness/create');
        return;
      }
    } catch {
      router.replace('/mybusiness/create');
      return;
    }
    setReady(true);
  }, [ready, router]);

  const addService = () => setServices((s) => [...s, { name: '', price: '', description: '', image: '' }]);
  const removeService = (i: number) => setServices((s) => s.filter((_, idx) => idx !== i));
  const updateService = (i: number, field: keyof ServiceItem, value: string) => {
    setServices((s) => s.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  };
  const addGalleryUrl = () => {
    const u = galleryUrl.trim();
    if (u && gallery.length < 20) {
      setGallery((g) => [...g, u]);
      setGalleryUrl('');
    }
  };
  const removeGallery = (i: number) => setGallery((g) => g.filter((_, idx) => idx !== i));

  const uploadImage = async (file: File): Promise<string> => {
    const form = new FormData();
    form.append('image', file);
    const { data } = await api.post<{ success: boolean; url: string }>('/business/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success || !data.url) throw new Error('Upload failed');
    return data.url;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file);
      setLogo(url);
      toast.success('Logo uploaded');
    } catch {
      toast.error('Logo upload failed');
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file?.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadImage(file);
      setCoverImage(url);
      toast.success('Cover uploaded');
    } catch {
      toast.error('Cover upload failed');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };
  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || gallery.length + files.length > 20) {
      toast.error('Max 20 images');
      return;
    }
    setUploadingGallery(true);
    try {
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          const url = await uploadImage(files[i]);
          setGallery((g) => [...g, url]);
        }
      }
      toast.success('Image(s) added');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const toggleSection = (id: string) => setOpenSection((s) => (s === id ? '' : id));

  const valid = draft && draft.businessName.trim() && draft.category.trim() && draft.phone.trim() && draft.city.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft || !valid || submitting) return;
    setSubmitting(true);
    try {
      const payload = {
        business_name: draft.businessName.trim(),
        category: draft.category.trim(),
        description: description.trim() || undefined,
        phone: draft.phone.trim(),
        whatsapp: whatsapp.trim() || undefined,
        email: email.trim() || undefined,
        website: draft.website?.trim() || undefined,
        address: address.trim() || undefined,
        state: state.trim() || undefined,
        city: (city || draft.city).trim(),
        pincode: pincode.trim() || undefined,
        ...(mapLat.trim() && mapLng.trim() && {
          map_location: { lat: Number(mapLat) || 0, lng: Number(mapLng) || 0 },
        }),
        logo: logo.trim() || undefined,
        cover_image: coverImage.trim() || undefined,
        gallery: gallery.length ? gallery : undefined,
        services: services
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            price: s.price.trim() || undefined,
            description: s.description.trim() || undefined,
            image: s.image.trim() || undefined,
          })),
        working_hours: Object.fromEntries(
          DAYS.map((d) => [
            d.key,
            workingHours[d.key].open || workingHours[d.key].close ? workingHours[d.key] : null,
          ]).filter(([, v]) => v)
        ) as Record<string, DayHours>,
        social_links: {
          ...(socialFacebook.trim() && { facebook: socialFacebook.trim() }),
          ...(socialInstagram.trim() && { instagram: socialInstagram.trim() }),
          ...(socialYoutube.trim() && { youtube: socialYoutube.trim() }),
        },
      };
      await api.post('/business', payload);
      sessionStorage.removeItem(DRAFT_KEY);
      toast.success('Business created successfully');
      router.push('/mybusiness');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create business';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user && !authLoading) return null;
  if (!ready || !draft) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <header className="border-b border-gray-200/80 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link
            href="/mybusiness"
            className="flex items-center gap-2.5 rounded-lg py-1 pr-2 transition-opacity hover:opacity-90"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <FiBriefcase className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-gray-900">Sell Box Business</span>
          </Link>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/help" className="rounded px-2 py-1 transition-colors hover:text-blue-600">Help Center</Link>
            <span className="text-gray-300">·</span>
            <Link href="/contact" className="rounded px-2 py-1 transition-colors hover:text-blue-600">Support</Link>
          </div>
        </div>
      </header>

      <div className="border-b border-gray-200/80 bg-white py-6">
        <div className="mx-auto flex max-w-3xl items-center justify-center gap-1 px-4">
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <FiCheck className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="mt-2 text-xs font-medium uppercase tracking-wider text-gray-500">Category</span>
          </div>
          <div className="h-1 flex-1 max-w-[72px] rounded-full bg-blue-600" aria-hidden />
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow-md shadow-blue-600/20">
              <FiCheck className="h-5 w-5" strokeWidth={2.5} />
            </div>
            <span className="mt-2 text-xs font-medium uppercase tracking-wider text-blue-600">Business details</span>
          </div>
          <div className="h-1 flex-1 max-w-[72px] rounded-full bg-blue-600" aria-hidden />
          <div className="flex flex-col items-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-md shadow-blue-600/20">
              3
            </div>
            <span className="mt-2 text-xs font-medium uppercase tracking-wider text-blue-600">Complete your profile</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200/80 bg-white px-4 py-3 shadow-sm">
          <Link
            href="/mybusiness/create"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
          >
            <FiArrowLeft className="h-4 w-4" /> Back
          </Link>
          <span className="text-xs font-medium uppercase tracking-wider text-gray-500">Step 3 – Complete your profile</span>
        </div>

        <Section id="contact" title="Contact &amp; Location" icon={FiPhone} open={openSection === 'contact'} onToggle={() => toggleSection('contact')}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.com" />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input type="tel" className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={inputClass + ' min-h-[80px]'} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell customers about your business" rows={3} />
            </div>
            <div>
              <label className={labelClass}>Address</label>
              <textarea className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" rows={2} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>State</label>
                <input type="text" className={inputClass} value={state} onChange={(e) => setState(e.target.value)} placeholder="State" />
              </div>
              <div>
                <label className={labelClass}>Pincode</label>
                <input type="text" className={inputClass} value={pincode} onChange={(e) => setPincode(e.target.value)} placeholder="Pincode" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Map latitude (optional)</label>
                <input type="text" className={inputClass} value={mapLat} onChange={(e) => setMapLat(e.target.value)} placeholder="e.g. 28.6139" />
              </div>
              <div>
                <label className={labelClass}>Map longitude (optional)</label>
                <input type="text" className={inputClass} value={mapLng} onChange={(e) => setMapLng(e.target.value)} placeholder="e.g. 77.2090" />
              </div>
            </div>
          </div>
        </Section>

        <Section id="images" title="Images" icon={FiImage} open={openSection === 'images'} onToggle={() => toggleSection('images')}>
          <div className="space-y-6">
            <div>
              <label className={labelClass}>Logo</label>
              <div className="flex flex-wrap items-start gap-4">
                <div className="flex flex-col gap-2">
                  {logo ? (
                    <div className="relative h-20 w-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                      <Image src={logo} alt="Logo" fill className="object-cover" sizes="80px" />
                    </div>
                  ) : (
                    <div className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                      <FiImage className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                  <input ref={logoInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogoUpload} />
                  <button type="button" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    <FiUpload className="h-4 w-4" /> {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 mb-1">Or paste URL</p>
                  <input type="url" className={inputClass} value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Cover image</label>
              <div className="flex flex-col gap-2">
                {coverImage ? (
                  <div className="relative h-32 w-full max-w-md rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
                    <Image src={coverImage} alt="Cover" fill className="object-cover" sizes="400px" />
                  </div>
                ) : (
                  <div className="h-32 max-w-md rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center">
                    <FiImage className="h-10 w-10 text-gray-400" />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleCoverUpload} />
                  <button type="button" disabled={uploadingCover} onClick={() => coverInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                    <FiUpload className="h-4 w-4" /> {uploadingCover ? 'Uploading…' : 'Upload cover'}
                  </button>
                  <input type="url" className={inputClass + ' flex-1 min-w-[200px]'} value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="Or cover image URL" />
                </div>
              </div>
            </div>
            <div>
              <label className={labelClass}>Gallery (max 20)</label>
              <div className="flex flex-wrap gap-2">
                <input ref={galleryInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={handleGalleryUpload} />
                <button type="button" disabled={uploadingGallery || gallery.length >= 20} onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  <FiUpload className="h-4 w-4" /> {uploadingGallery ? 'Uploading…' : 'Upload image(s)'}
                </button>
                <div className="flex gap-2 flex-1 min-w-0">
                  <input type="url" className={inputClass + ' flex-1 min-w-0'} value={galleryUrl} onChange={(e) => setGalleryUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGalleryUrl())} placeholder="Or paste image URL" />
                  <button type="button" onClick={addGalleryUrl} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0">
                    <FiPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {gallery.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {gallery.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 group">
                      <Image src={url} alt={`Gallery image ${i + 1}`} fill className="object-cover" sizes="120px" />
                      <button type="button" onClick={() => removeGallery(i)} className="absolute top-1 right-1 rounded-full bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition" aria-label="Remove">
                        <FiTrash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section id="services" title="Services" icon={FiBriefcase} open={openSection === 'services'} onToggle={() => toggleSection('services')}>
          <div className="space-y-4">
            {services.map((s, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50/50 p-4">
                <div className="mb-3 flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Service {i + 1}</span>
                  <button type="button" onClick={() => removeService(i)} className="text-red-600 hover:underline" disabled={services.length <= 1}>
                    <FiTrash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="text" className={inputClass} value={s.name} onChange={(e) => updateService(i, 'name', e.target.value)} placeholder="Service name" />
                  <input type="text" className={inputClass} value={s.price} onChange={(e) => updateService(i, 'price', e.target.value)} placeholder="Price (e.g. ₹500)" />
                </div>
                <textarea className={inputClass + ' mt-2'} value={s.description} onChange={(e) => updateService(i, 'description', e.target.value)} placeholder="Short description" rows={2} />
                <input type="url" className={inputClass + ' mt-2'} value={s.image} onChange={(e) => updateService(i, 'image', e.target.value)} placeholder="Image URL (optional)" />
              </div>
            ))}
            <button type="button" onClick={addService} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <FiPlus className="h-4 w-4" /> Add service
            </button>
          </div>
        </Section>

        <Section id="hours" title="Working hours" icon={FiClock} open={openSection === 'hours'} onToggle={() => toggleSection('hours')}>
          <div className="space-y-3">
            {DAYS.map((d) => (
              <div key={d.key} className="flex flex-wrap items-center gap-2">
                <span className="w-24 text-sm text-gray-700">{d.label}</span>
                <input type="text" className={inputClass + ' w-28'} value={workingHours[d.key].open} onChange={(e) => setWorkingHours((h) => ({ ...h, [d.key]: { ...h[d.key], open: e.target.value } }))} placeholder="9:00 AM" />
                <span className="text-gray-400">–</span>
                <input type="text" className={inputClass + ' w-28'} value={workingHours[d.key].close} onChange={(e) => setWorkingHours((h) => ({ ...h, [d.key]: { ...h[d.key], close: e.target.value } }))} placeholder="6:00 PM" />
              </div>
            ))}
          </div>
        </Section>

        <Section id="social" title="Social links" icon={FiShare2} open={openSection === 'social'} onToggle={() => toggleSection('social')}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Facebook</label>
              <input type="url" className={inputClass} value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} placeholder="https://facebook.com/..." />
            </div>
            <div>
              <label className={labelClass}>Instagram</label>
              <input type="url" className={inputClass} value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} placeholder="https://instagram.com/..." />
            </div>
            <div>
              <label className={labelClass}>YouTube</label>
              <input type="url" className={inputClass} value={socialYoutube} onChange={(e) => setSocialYoutube(e.target.value)} placeholder="https://youtube.com/..." />
            </div>
          </div>
        </Section>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <button type="submit" disabled={!valid || submitting} className="flex-1 rounded-xl bg-blue-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md disabled:pointer-events-none disabled:opacity-50">
            {submitting ? 'Creating…' : 'Create Business'}
          </button>
          <Link href="/mybusiness" className="rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
            Cancel
          </Link>
        </div>

        <footer className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-white/80 py-3 text-xs text-gray-500">
          <FiLock className="h-3.5 w-3.5 text-gray-400" />
          <span>SECURED BY SSL</span>
        </footer>
      </form>
    </div>
  );
}
