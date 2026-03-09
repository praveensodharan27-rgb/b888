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
  FiShoppingBag,
  FiCoffee,
  FiMonitor,
  FiActivity,
  FiTool,
  FiInfo,
  FiCheck,
  FiLock,
  FiSearch,
} from 'react-icons/fi';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20';
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

const TOTAL_STEPS = 3;

const BUSINESS_CATEGORIES = [
  {
    id: 'retail',
    name: 'Retail',
    description: 'E-commerce, boutique shops, and consumer goods distribution.',
    icon: FiShoppingBag,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-600',
  },
  {
    id: 'food-beverage',
    name: 'Food & Beverage',
    description: 'Restaurants, catering, cafes, and beverage manufacturers.',
    icon: FiCoffee,
    iconBg: 'bg-pink-100',
    iconColor: 'text-pink-600',
  },
  {
    id: 'technology',
    name: 'Technology',
    description: 'SaaS, fintech, IT infrastructure, and digital products.',
    icon: FiMonitor,
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Clinics, wellness centers, biotech, and medical services.',
    icon: FiActivity,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
  },
  {
    id: 'professional-services',
    name: 'Professional Services',
    description: 'Consulting, legal, accounting, and creative agencies.',
    icon: FiBriefcase,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
  },
  {
    id: 'construction',
    name: 'Construction',
    description: 'Engineering, trade crafts, real estate, and architecture.',
    icon: FiTool,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
  },
];

export default function CreateBusinessPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [openSection, setOpenSection] = useState<string>('basic');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categorySearch, setCategorySearch] = useState('');

  const [businessName, setBusinessName] = useState('');
  const [tradingName, setTradingName] = useState('');
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

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (typeof window === 'undefined' || step !== 1) return;
    try {
      const raw = sessionStorage.getItem('business_create_draft');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed?.businessName && parsed?.category && parsed?.phone && parsed?.city) {
        setBusinessName(parsed.businessName);
        setCategory(parsed.category);
        setTradingName(parsed.tradingName || '');
        setWebsite(parsed.website || '');
        setPhone(parsed.phone);
        setCity(parsed.city);
        setStep(2);
      }
    } catch {
      // ignore
    }
  }, [step]);

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
      DAYS.map((d) => [d.key, workingHours[d.key].open || workingHours[d.key].close ? workingHours[d.key] : null]).filter(([, v]) => v)
    ) as Record<string, DayHours>,
    social_links: {
      ...(socialFacebook.trim() && { facebook: socialFacebook.trim() }),
      ...(socialInstagram.trim() && { instagram: socialInstagram.trim() }),
      ...(socialYoutube.trim() && { youtube: socialYoutube.trim() }),
    },
  };

  const valid = businessName.trim() && category.trim() && phone.trim() && city.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await api.post('/business', payload);
      toast.success('Business created successfully');
      router.push('/mybusiness');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create business';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSection = (id: string) => setOpenSection((s) => (s === id ? '' : id));

  const selectedCategory = selectedCategoryId ? BUSINESS_CATEGORIES.find((c) => c.id === selectedCategoryId) : null;
  const progressPercent = (step / TOTAL_STEPS) * 100;

  const handleCategorySelect = (id: string) => {
    setSelectedCategoryId(id);
    const cat = BUSINESS_CATEGORIES.find((c) => c.id === id);
    if (cat) setCategory(cat.name);
  };

  const handleContinueFromStep1 = () => {
    if (selectedCategoryId) setCategory(BUSINESS_CATEGORIES.find((c) => c.id === selectedCategoryId)?.name ?? '');
    setStep(2);
  };

  if (!user && !authLoading) return null;

  // —— Step 1: Category selection (onboarding style) ——
  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#f8fafc]">
        <header className="border-b border-gray-200/80 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link
              href="/mybusiness"
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </Link>
            <div className="flex flex-1 flex-col items-center gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
                Onboarding: {Math.round(progressPercent)}% complete
              </p>
              <div className="h-2 w-52 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
            <span className="w-14 text-right text-sm font-medium text-gray-500">Step 1 of {TOTAL_STEPS}</span>
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
          <h1 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            What type of business do you run?
          </h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-gray-500 sm:text-base">
            Select the category that best describes your core operations. We&apos;ll tailor your experience accordingly.
          </p>

          <div className="mx-auto mt-8 w-full max-w-2xl">
            <label htmlFor="category-search" className="sr-only">Search categories</label>
            <div className="relative">
              <FiSearch className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="category-search"
                type="search"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
              {categorySearch && (
                <button
                  type="button"
                  onClick={() => setCategorySearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </div>
          </div>

          {(() => {
            const q = categorySearch.trim().toLowerCase();
            const filteredCategories = q
              ? BUSINESS_CATEGORIES.filter(
                  (c) => c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)
                )
              : BUSINESS_CATEGORIES;
            return (
          <>
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCategories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategoryId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleCategorySelect(cat.id)}
                  className={`flex flex-col rounded-2xl border-2 bg-white p-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 ${
                    isSelected ? 'border-blue-500 shadow-md ring-2 ring-blue-500/30' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`mb-3 flex h-12 w-12 items-center justify-center rounded-xl ${cat.iconBg} ${cat.iconColor}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-bold text-gray-900">{cat.name}</h3>
                  <p className="mt-1.5 text-sm leading-snug text-gray-500">{cat.description}</p>
                </button>
              );
            })}
          </div>
          {filteredCategories.length === 0 && categorySearch.trim() && (
            <p className="mt-4 text-center text-sm text-gray-500">No categories match &quot;{categorySearch.trim()}&quot;. Try a different search.</p>
          )}
          </>
            );
          })()}

          <p className="mt-10 text-center text-sm text-gray-500">
            Don&apos;t see your category?{' '}
            <button type="button" className="font-medium text-blue-600 transition-colors hover:text-blue-700 hover:underline">
              Suggest an industry
            </button>
          </p>

          <footer className="mt-14 flex flex-col items-center justify-between gap-6 sm:flex-row sm:items-end">
            <p className="flex items-center gap-2 text-sm text-gray-500">
              <span className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm">
                <FiInfo className="h-3.5 w-3.5 text-gray-500" />
              </span>
              You can change this later in your profile settings.
            </p>
            <div className="flex w-full shrink-0 gap-3 sm:w-auto">
              <button
                type="button"
                onClick={handleContinueFromStep1}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
              >
                Skip for now
              </button>
              <button
                type="button"
                onClick={handleContinueFromStep1}
                disabled={!selectedCategoryId}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow disabled:pointer-events-none disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none"
              >
                Continue
              </button>
            </div>
          </footer>
        </div>
      </div>
    );
  }

  const websiteDisplay = (website || '').replace(/^https?:\/\//i, '').trim();
  const setWebsiteFromDisplay = (v: string) => {
    const trimmed = (v || '').trim();
    setWebsite(trimmed ? (trimmed.startsWith('http') ? trimmed : `https://${trimmed}`) : '');
  };

  // —— Steps 2 & 3: Business Details layout + step progress ——
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top bar: logo left, Help | Support right */}
      <header className="border-b border-gray-200/80 bg-white shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/mybusiness" className="flex items-center gap-2.5 rounded-lg py-1 pr-2 transition-opacity hover:opacity-90">
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

      {/* Progress: 3 steps with circles and connecting line */}
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
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors ${step >= 2 ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-gray-200 text-gray-400'}`}>
              {step >= 3 ? <FiCheck className="h-5 w-5" strokeWidth={2.5} /> : '2'}
            </div>
            <span className={`mt-2 text-xs font-medium uppercase tracking-wider ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>Business details</span>
          </div>
          <div className={`h-1 flex-1 max-w-[72px] rounded-full transition-colors ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`} aria-hidden />
          <div className="flex flex-col items-center">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold shadow-sm transition-colors ${step >= 3 ? 'bg-blue-600 text-white shadow-blue-600/20' : 'bg-gray-200 text-gray-400'}`}>
              3
            </div>
            <span className={`mt-2 text-xs font-medium uppercase tracking-wider ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>Verification</span>
          </div>
        </div>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {/* Step 2: Business Details – white card */}
        {step >= 2 && (
          <>
        <div className="rounded-2xl border border-gray-200/80 bg-white p-6 shadow-md shadow-gray-200/50 sm:p-8">
          <h2 className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl">Business Details</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">Please provide your official business information to continue with the setup.</p>

          <div className="mt-6 space-y-5">
            <div>
              <label className={labelClass}>Legal Business Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Acme Corporation Ltd."
                required
              />
            </div>
            <div>
              <label className={labelClass}>Trading Name (if different)</label>
              <input
                type="text"
                className={inputClass}
                value={tradingName}
                onChange={(e) => setTradingName(e.target.value)}
                placeholder="e.g. Acme Tech Solutions"
              />
              <p className="mt-1 text-xs text-gray-500">Leave blank if same as legal name.</p>
            </div>
            <div>
              <label className={labelClass}>Website URL</label>
              <div className="flex overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20">
                <span className="flex items-center border-r border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-500">https://</span>
                <input
                  type="text"
                  className="flex-1 border-0 bg-transparent px-3.5 py-2.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                  value={websiteDisplay}
                  onChange={(e) => setWebsiteFromDisplay(e.target.value)}
                  placeholder="www.example.com"
                />
              </div>
            </div>
            <div>
              <label className={labelClass}>Phone <span className="text-red-500">*</span></label>
              <input
                type="tel"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                required
              />
            </div>
            <div>
              <label className={labelClass}>City <span className="text-red-500">*</span></label>
              <input
                type="text"
                className={inputClass}
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="City"
                required
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
            >
              <FiArrowLeft className="h-4 w-4" /> Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!businessName.trim() || !category.trim() || !phone.trim() || !city.trim()) {
                  toast.error('Please fill all required fields (Legal Business Name, Category, Phone, City)');
                  return;
                }
                const draft = {
                  businessName: businessName.trim(),
                  category: category.trim(),
                  tradingName: tradingName.trim() || undefined,
                  website: website.trim() || '',
                  phone: phone.trim(),
                  city: city.trim(),
                };
                if (typeof window !== 'undefined') sessionStorage.setItem('business_create_draft', JSON.stringify(draft));
                router.push('/mybusiness/create/complete');
              }}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 hover:shadow-md"
            >
              Continue
            </button>
          </div>
        </div>

        {step === 2 && (
          <footer className="mt-8 flex items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-white/80 py-3 text-xs text-gray-500">
            <FiLock className="h-3.5 w-3.5 text-gray-400" />
            <span>SECURED BY SSL</span>
          </footer>
        )}
          </>
        )}

      </form>
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
