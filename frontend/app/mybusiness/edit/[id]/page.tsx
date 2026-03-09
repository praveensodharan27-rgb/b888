'use client';

import { useState, useEffect, useRef, useMemo, memo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from '@/lib/toast';
import { getApiBaseOrigin } from '@/lib/seo';
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
  FiGlobe,
  FiMail,
  FiSend,
  FiBookmark,
  FiStar,
  FiBarChart2,
  FiTarget,
  FiCloud,
  FiShield,
} from 'react-icons/fi';

const inputClass =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

type ServiceItem = { name: string, price: string, description: string, image: string };
type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
type DayHours = { open: string, close: string };
type WorkingHoursMap = Record<DayKey, DayHours>;

const DAYS: { key: DayKey, label: string }[] = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' },
];

const DEFAULT_DAY: DayHours = { open: '', close: '' };

function getInitialWorkingHours(): WorkingHoursMap {
  return DAYS.reduce(
    (acc, d) => ({ ...acc, [d.key]: { ...DEFAULT_DAY } }),
    {} as WorkingHoursMap
  );
}

type BusinessData = {
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
  workingHours: Record<string, DayHours> | null;
  socialLinks: { facebook?: string, instagram?: string, youtube?: string } | null;
};

function parseServices(raw: unknown): ServiceItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [{ name: '', price: '', description: '', image: '' }];
  return raw.map((s: any) => ({
    name: s?.name ?? '',
    price: s?.price ?? '',
    description: s?.description ?? '',
    image: s?.image ?? '',
  }));
}

function parseWorkingHours(raw: unknown): WorkingHoursMap {
  const def = getInitialWorkingHours();
  if (!raw || typeof raw !== 'object') return def;
  const o = raw as Record<string, { open?: string, close?: string }>;
  DAYS.forEach((d) => {
    if (o[d.key] && typeof o[d.key] === 'object') {
      def[d.key] = { open: o[d.key].open ?? '', close: o[d.key].close ?? '' };
    }
  });
  return def;
}

// ----- Preview helpers (mirror public page) -----
function isValidImageUrl(value: unknown): value is string {
  if (value == null || typeof value !== 'string') return false;
  const s = value.trim();
  if (!s) return false;
  if (!s.startsWith('http://') && !s.startsWith('https://')) return false;
  try {
    new URL(s);
    return true;
  } catch {
    return false;
  }
}

function resolveImageUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== 'string') return null;
  const s = url.trim();
  if (!s) return null;
  if (s.startsWith('http://') || s.startsWith('https://')) return s;
  if (s.startsWith('/')) return getApiBaseOrigin() + s;
  return getApiBaseOrigin() + '/' + s;
}

function formatTimeTo12h(time: string): string {
  const t = time.trim();
  if (!t || /closed|^\s*$/i.test(t)) return t;
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

function formatHoursForPreview(h: WorkingHoursMap): Record<string, string> {
  const labels: Record<string, string> = {
    monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday',
    friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday',
  };
  const out: Record<string, string> = {};
  DAYS.forEach((d) => {
    const open = h[d.key]?.open?.trim();
    const close = h[d.key]?.close?.trim();
    if (open || close) {
      const openStr = open ? formatTimeTo12h(open) : '';
      const closeStr = close ? formatTimeTo12h(close) : '';
      out[labels[d.key]] = [openStr, closeStr].filter(Boolean).join(' to ');
    } else {
      out[labels[d.key]] = '9 am to 6 pm';
    }
  });
  return out;
}

export type PreviewData = {
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
  workingHours: WorkingHoursMap;
  socialFacebook: string;
  socialInstagram: string;
  socialYoutube: string;
};

const cardClass = 'rounded-[20px] bg-white p-6 shadow-[0_2px_12px_rgba(0,0,0,0.06)]';
const sectionTitleClass = 'border-l-4 border-blue-500 pl-3 text-lg font-bold text-gray-900';

const BusinessEditPreview = memo(function BusinessEditPreview({ data }: { data: PreviewData }) {
  const hoursFormatted = useMemo(() => formatHoursForPreview(data.workingHours), [data.workingHours]);
  const servicesList = useMemo(
    () => data.services.filter((s) => s.name.trim()),
    [data.services]
  );
  const logoUrl = resolveImageUrl(data.logo || null);
  const coverUrl = resolveImageUrl(data.coverImage || null);
  const hasCover = isValidImageUrl(coverUrl);

  return (
    <div className="min-h-screen bg-[#f6f8fb] font-sans antialiased rounded-xl border border-gray-200 overflow-hidden shadow-lg">
      <div className="relative h-40 w-full overflow-hidden">
        {hasCover && coverUrl ? (
          <>
            <Image src={coverUrl} alt={`${data.businessName} cover`} fill className="object-cover object-center" sizes="400px" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#f6f8fb]/95 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-800" />
        )}
      </div>
      <div className="px-4 py-6 -mt-2 relative z-10">
        <div className={`${cardClass} mb-4 flex flex-col gap-4`}>
          <div className="flex flex-wrap items-center gap-3">
            {isValidImageUrl(logoUrl) && logoUrl ? (
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gray-100">
                <Image src={logoUrl} alt={`${data.businessName} logo`} fill className="object-cover" sizes="64px" />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                <FiBriefcase className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">
                {data.businessName || 'Business name'}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-gray-600">
                {data.category && <span className="flex items-center gap-1"><FiBriefcase className="h-3.5 w-3.5" />{data.category}</span>}
                {data.city && <span className="flex items-center gap-1"><FiMapPin className="h-3.5 w-3.5" />{[data.city, data.state].filter(Boolean).join(', ')}</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white">
              <FiSend className="h-3.5 w-3.5" /> Contact
            </span>
            <span className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 py-2 px-3 text-xs font-medium text-blue-600">
              <FiBookmark className="h-3.5 w-3.5" /> Save
            </span>
          </div>
        </div>

        {data.description?.trim() && (
          <section className={`${cardClass} mb-4`}>
            <h2 className={sectionTitleClass}>About the Company</h2>
            <p className="mt-3 text-sm leading-relaxed text-gray-600 line-clamp-3">{data.description}</p>
          </section>
        )}

        {servicesList.length > 0 && (
          <section className={`${cardClass} mb-4`}>
            <h2 className={sectionTitleClass}>Our Core Services</h2>
            <div className="mt-3 space-y-2">
              {servicesList.slice(0, 4).map((s, i) => {
                const icons = [FiBarChart2, FiTarget, FiCloud, FiShield];
                const Icon = icons[i % icons.length];
                return (
                  <div key={i} className="rounded-lg bg-gray-50/80 p-3">
                    {isValidImageUrl(s.image) ? (
                      <div className="relative mb-2 h-8 w-8 overflow-hidden rounded-lg bg-white">
                        <Image src={s.image} alt={s.name || 'Service'} fill className="object-cover" sizes="32px" />
                      </div>
                    ) : (
                      <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-900 text-sm">{s.name}</h3>
                    {s.price && <p className="text-xs font-medium text-blue-600">{s.price}</p>}
                    {s.description && <p className="mt-0.5 text-xs text-gray-600 line-clamp-2">{s.description}</p>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <div className={`${cardClass} mb-4`}>
          <h3 className="text-base font-bold text-gray-900">Business Hours</h3>
          <ul className="mt-3 space-y-1.5 text-xs">
            {Object.entries(hoursFormatted).map(([day, time]) => (
              <li key={day} className="flex justify-between gap-2">
                <span className="text-gray-700">{day}</span>
                <span className="text-gray-600">{time}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`${cardClass} mb-4`}>
          <h3 className="text-base font-bold text-gray-900">Connect with Us</h3>
          <div className="mt-3 space-y-2 text-sm">
            {data.phone && <p className="flex items-center gap-2 text-gray-700"><FiPhone className="h-4 w-4 shrink-0" />{data.phone}</p>}
            {data.whatsapp && <p className="flex items-center gap-2 text-gray-700"><FiPhone className="h-4 w-4 shrink-0" />WhatsApp: {data.whatsapp}</p>}
            {data.email && <p className="flex items-center gap-2 text-gray-700"><FiMail className="h-4 w-4 shrink-0" />{data.email}</p>}
            {data.website?.trim() && (
              <p className="flex items-center gap-2 text-gray-700">
                <FiGlobe className="h-4 w-4 shrink-0" />
                {data.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </p>
            )}
            {!data.phone && !data.whatsapp && !data.email && !data.website?.trim() && (
              <p className="text-gray-400 text-xs">Contact details will appear here</p>
            )}
          </div>
        </div>

        {(data.address || data.city) && (
          <div className={`${cardClass} mb-4`}>
            <h3 className="text-base font-bold text-gray-900">Location</h3>
            <p className="mt-2 text-sm text-gray-600">
              {[data.address, data.city, data.state, data.pincode].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {data.gallery.filter((u) => isValidImageUrl(u)).length > 0 && (
          <section className={`${cardClass} mb-4`}>
            <h2 className={sectionTitleClass}>Gallery</h2>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {data.gallery.filter(isValidImageUrl).slice(0, 6).map((url, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-gray-100">
                  <Image src={url} alt={`${data.businessName} gallery image ${i + 1}`} fill className="object-cover" sizes="100px" />
                </div>
              ))}
            </div>
          </section>
        )}

        {(data.socialFacebook || data.socialInstagram || data.socialYoutube) && (
          <div className={`${cardClass}`}>
            <h3 className="text-base font-bold text-gray-900">Social</h3>
            <p className="mt-2 text-xs text-gray-600">
              {[data.socialFacebook && 'Facebook', data.socialInstagram && 'Instagram', data.socialYoutube && 'YouTube'].filter(Boolean).join(' · ')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
});

export default function EditBusinessPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { user, isLoading: authLoading } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [openSection, setOpenSection] = useState<string>('basic');
  const [ready, setReady] = useState(false);

  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
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

  const { data, isLoading, error } = useQuery({
    queryKey: ['business', id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: BusinessData }>(`/business/${id}`);
      return res.data.data;
    },
    enabled: !!user && !!id,
  });

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!data || ready) return;
    setBusinessName(data.businessName || '');
    setCategory(data.category || '');
    setDescription(data.description || '');
    setPhone(data.phone || '');
    setWhatsapp(data.whatsapp || '');
    setEmail(data.email || '');
    setWebsite(data.website || '');
    setAddress(data.address || '');
    setState(data.state || '');
    setCity(data.city || '');
    setPincode(data.pincode || '');
    const ml = data.mapLocation;
    setMapLat(ml?.lat != null ? String(ml.lat) : '');
    setMapLng(ml?.lng != null ? String(ml.lng) : '');
    setLogo(data.logo || '');
    setCoverImage(data.coverImage || '');
    setGallery(Array.isArray(data.gallery) ? data.gallery : []);
    setServices(parseServices(data.services));
    setWorkingHours(parseWorkingHours(data.workingHours));
    const sl = data.socialLinks;
    setSocialFacebook(sl?.facebook || '');
    setSocialInstagram(sl?.instagram || '');
    setSocialYoutube(sl?.youtube || '');
    setReady(true);
  }, [data, ready]);

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
    const { data } = await api.post<{ success: boolean, url: string }>('/business/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!data.success || !data.url) throw new Error('Upload failed');
    return data.url;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image (JPG, PNG, WebP)');
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
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image (JPG, PNG, WebP)');
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadImage(file);
      setCoverImage(url);
      toast.success('Cover image uploaded');
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
      toast.error('Max 20 gallery images. Add fewer.');
      return;
    }
    setUploadingGallery(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        const url = await uploadImage(file);
        setGallery((g) => [...g, url]);
      }
      toast.success('Image(s) added to gallery');
    } catch {
      toast.error('Gallery upload failed');
    } finally {
      setUploadingGallery(false);
      e.target.value = '';
    }
  };

  const payload = {
    business_name: businessName.trim(),
    category: category.trim(),
    description: description.trim() || undefined,
    phone: phone.trim(),
    whatsapp: whatsapp.trim() || undefined,
    email: email.trim() || undefined,
    website: website.trim() || undefined,
    address: address.trim() || undefined,
    state: state.trim() || undefined,
    city: city.trim(),
    pincode: pincode.trim() || undefined,
    map_location:
      mapLat.trim() && mapLng.trim()
        ? { lat: Number(mapLat) || 0, lng: Number(mapLng) || 0 }
        : null,
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
      DAYS.map((d) => [d.key, workingHours[d.key].open || workingHours[d.key].close ? workingHours[d.key] : null]).filter(([, v]) => v)
    ) as Record<string, DayHours>,
    social_links: {
      ...(socialFacebook.trim() && { facebook: socialFacebook.trim() }),
      ...(socialInstagram.trim() && { instagram: socialInstagram.trim() }),
      ...(socialYoutube.trim() && { youtube: socialYoutube.trim() }),
    },
  };

  const valid = businessName.trim() && category.trim() && phone.trim() && city.trim();

  const previewData: PreviewData = useMemo(
    () => ({
      businessName,
      category,
      description,
      phone,
      whatsapp,
      email,
      website,
      address,
      state,
      city,
      pincode,
      mapLat,
      mapLng,
      logo,
      coverImage,
      gallery,
      services,
      workingHours,
      socialFacebook,
      socialInstagram,
      socialYoutube,
    }),
    [
      businessName,
      category,
      description,
      phone,
      whatsapp,
      email,
      website,
      address,
      state,
      city,
      pincode,
      mapLat,
      mapLng,
      logo,
      coverImage,
      gallery,
      services,
      workingHours,
      socialFacebook,
      socialInstagram,
      socialYoutube,
    ]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !valid || submitting) return;
    setSubmitting(true);
    try {
      await api.put(`/business/${id}`, payload);
      toast.success('Business updated successfully');
      router.push('/mybusiness');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update business';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSection = (sec: string) => setOpenSection((s) => (s === sec ? '' : sec));

  if (!user && !authLoading) return null;
  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Invalid business ID.</p>
      </div>
    );
  }
  if (isLoading || !ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-medium text-red-800">Business not found or you don’t have access.</p>
          <Link href="/mybusiness" className="mt-3 inline-block text-sm text-blue-600 underline">
            Back to My Business
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 py-4">
          <Link href="/mybusiness" className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
            <FiArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <h1 className="text-lg font-semibold text-gray-900">Edit Business</h1>
          <span className="w-14" />
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:gap-8">
          {/* Left: editable form – scrollable on desktop */}
          <div className="min-w-0 lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">
            <form onSubmit={handleSubmit} className="max-w-2xl">
        <Section id="basic" title="Basic info" icon={FiBriefcase} open={openSection === 'basic'} onToggle={() => toggleSection('basic')}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Business name *</label>
              <input type="text" className={inputClass} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Category *</label>
              <input type="text" className={inputClass} value={category} onChange={(e) => setCategory(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={inputClass + ' min-h-[100px]'} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            </div>
          </div>
        </Section>

        <Section id="contact" title="Contact info" icon={FiPhone} open={openSection === 'contact'} onToggle={() => toggleSection('contact')}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Phone *</label>
              <input type="tel" className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>WhatsApp</label>
              <input type="tel" className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Website</label>
              <input type="url" className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} />
            </div>
          </div>
        </Section>

        <Section id="location" title="Location" icon={FiMapPin} open={openSection === 'location'} onToggle={() => toggleSection('location')}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Address</label>
              <textarea className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} rows={2} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={labelClass}>State</label>
                <input type="text" className={inputClass} value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>City *</label>
                <input type="text" className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Pincode</label>
                <input type="text" className={inputClass} value={pincode} onChange={(e) => setPincode(e.target.value)} />
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
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    type="button"
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FiUpload className="h-4 w-4" />
                    {uploadingLogo ? 'Uploading…' : 'Upload logo'}
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
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <button
                    type="button"
                    disabled={uploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <FiUpload className="h-4 w-4" />
                    {uploadingCover ? 'Uploading…' : 'Upload cover'}
                  </button>
                  <input type="url" className={inputClass + ' flex-1 min-w-[200px]'} value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="Or cover image URL" />
                </div>
              </div>
            </div>

            <div>
              <label className={labelClass}>Gallery (max 20)</label>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleGalleryUpload}
                />
                <button
                  type="button"
                  disabled={uploadingGallery || gallery.length >= 20}
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <FiUpload className="h-4 w-4" />
                  {uploadingGallery ? 'Uploading…' : 'Upload image(s)'}
                </button>
                <div className="flex gap-2 flex-1 min-w-0">
                  <input
                    type="url"
                    className={inputClass + ' flex-1 min-w-0'}
                    value={galleryUrl}
                    onChange={(e) => setGalleryUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGalleryUrl())}
                    placeholder="Or paste image URL"
                  />
                  <button type="button" onClick={addGalleryUrl} className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shrink-0">
                    <FiPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {gallery.length > 0 && (
                <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {gallery.map((url, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 group">
                      <Image src={url} alt={`${businessName || 'Business'} gallery image ${i + 1}`} fill className="object-cover" sizes="120px" />
                      <button
                        type="button"
                        onClick={() => removeGallery(i)}
                        className="absolute top-1 right-1 rounded-full bg-red-500 text-white p-1 opacity-0 group-hover:opacity-100 transition"
                        aria-label="Remove"
                      >
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
                  <input type="text" className={inputClass} value={s.price} onChange={(e) => updateService(i, 'price', e.target.value)} placeholder="Price" />
                </div>
                <textarea className={inputClass + ' mt-2'} value={s.description} onChange={(e) => updateService(i, 'description', e.target.value)} placeholder="Description" rows={2} />
                <input type="url" className={inputClass + ' mt-2'} value={s.image} onChange={(e) => updateService(i, 'image', e.target.value)} placeholder="Image URL" />
              </div>
            ))}
            <button type="button" onClick={addService} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
              <FiPlus className="h-4 w-4" />
              Add service
            </button>
          </div>
        </Section>

        <Section id="hours" title="Working hours" icon={FiClock} open={openSection === 'hours'} onToggle={() => toggleSection('hours')}>
          <div className="space-y-3">
            {DAYS.map((d) => (
              <div key={d.key} className="flex flex-wrap items-center gap-2">
                <span className="w-24 text-sm text-gray-700">{d.label}</span>
                <input
                  type="text"
                  className={inputClass + ' w-28'}
                  value={workingHours[d.key].open}
                  onChange={(e) => setWorkingHours((h) => ({ ...h, [d.key]: { ...h[d.key], open: e.target.value } }))}
                  placeholder="9:00 AM"
                />
                <span className="text-gray-400">–</span>
                <input
                  type="text"
                  className={inputClass + ' w-28'}
                  value={workingHours[d.key].close}
                  onChange={(e) => setWorkingHours((h) => ({ ...h, [d.key]: { ...h[d.key], close: e.target.value } }))}
                  placeholder="6:00 PM"
                />
              </div>
            ))}
          </div>
        </Section>

        <Section id="social" title="Social links" icon={FiShare2} open={openSection === 'social'} onToggle={() => toggleSection('social')}>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Facebook</label>
              <input type="url" className={inputClass} value={socialFacebook} onChange={(e) => setSocialFacebook(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Instagram</label>
              <input type="url" className={inputClass} value={socialInstagram} onChange={(e) => setSocialInstagram(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>YouTube</label>
              <input type="url" className={inputClass} value={socialYoutube} onChange={(e) => setSocialYoutube(e.target.value)} />
            </div>
          </div>
        </Section>

        <div className="mt-8 flex gap-3">
          <button type="submit" disabled={!valid || submitting} className="flex-1 rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
          <Link href="/mybusiness" className="rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </Link>
        </div>
      </form>
          </div>

          {/* Right: live preview – below form on mobile, sticky on desktop */}
          <div className="min-w-0 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto">
            <div className="mb-2 text-sm font-medium text-gray-500 lg:mb-3">Live preview</div>
            <BusinessEditPreview data={previewData} />
          </div>
        </div>
      </div>
    </div>
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
    <div className="mb-4 rounded-xl border border-gray-200 bg-white shadow-sm" id={id}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 text-left">
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Icon className="h-5 w-5 text-blue-600" />
          {title}
        </span>
        {open ? <FiChevronUp className="h-5 w-5 text-gray-500" /> : <FiChevronDown className="h-5 w-5 text-gray-500" />}
      </button>
      {open && <div className="border-t border-gray-100 px-4 py-4">{children}</div>}
    </div>
  );
}
