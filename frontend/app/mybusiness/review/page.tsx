'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FiUser, FiInfo, FiMapPin, FiClock } from 'react-icons/fi';
import { useBusinessWizard } from '@/contexts/BusinessWizardContext';
import api from '@/lib/api';
import toast from '@/lib/toast';

function slugifyLocation(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || '';
}

export default function BusinessReviewPage() {
  const router = useRouter();
  const { state, setAgreedToTerms, persist, reset } = useBusinessWizard();
  const [submitting, setSubmitting] = useState(false);

  const categoryName = state.categoryName || state.category || null;
  const categorySlug = state.category ? String(state.category) : null;

  const addressParts = [
    state.location.street,
    state.location.building,
    state.location.city,
    state.location.state,
    state.location.postalCode,
  ].filter(Boolean);
  const addressLine = addressParts.length ? addressParts.join(', ') : null;
  const hasAddress = !state.location.noPhysicalLocation && addressLine;

  const handleSubmit = async () => {
    if (!state.agreedToTerms) {
      toast.error('Please agree to the Terms and Privacy Policy.');
      return;
    }
    if (!categorySlug) {
      toast.error('Please select a business category.');
      return;
    }
    const stateSlug = slugifyLocation(state.location.state);
    const citySlug = slugifyLocation(state.location.city);
    if (!stateSlug || !citySlug) {
      toast.error('Please enter state and city for your business location.');
      return;
    }
    setSubmitting(true);
    try {
      const addressParts = [
        state.location.street,
        state.location.building,
        state.location.city,
        state.location.state,
        state.location.postalCode,
      ].filter(Boolean);
      const res = await api.post('/directory/businesses', {
        name: state.details.tradingName?.trim() || state.details.legalName?.trim(),
        phone: state.details.phone?.trim(),
        email: state.details.email?.trim(),
        website: state.details.website?.trim() || null,
        address: addressParts.length ? addressParts.join(', ') : null,
        latitude: state.location.lat ?? null,
        longitude: state.location.lng ?? null,
        stateSlug,
        citySlug,
        state: state.location.state?.trim() || undefined,
        city: state.location.city?.trim() || undefined,
        categorySlug,
        openingHours: Object.keys(state.operatingHours || {}).length > 0 ? state.operatingHours : null,
      });
      if (res.data?.success && res.data?.business) {
        persist();
        reset();
        toast.success('Business profile submitted successfully.');
        const b = res.data.business;
        const path = b.state?.slug && b.city?.slug && b.category?.slug && b.slug
          ? `/in/${b.state.slug}/${b.city.slug}/${b.category.slug}/${b.slug}`
          : '/in';
        router.push(path);
      } else {
        toast.error(res.data?.message || 'Failed to create business');
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg || 'Failed to submit business. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    persist();
    router.push('/business-package');
  };

  const handleBack = () => router.push('/mybusiness/location');

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <span aria-hidden>←</span> Back
          </button>
          <span className="text-sm font-medium text-gray-500">Step 4 of 4</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-2xl font-bold text-gray-900">
          Review Business Profile
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Please verify your information before submitting for approval.
        </p>

        <div className="mt-8 space-y-6">
          {/* Business Type */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiUser className="h-5 w-5 text-[#2563EB]" />
                <h2 className="font-semibold text-gray-900">Business Type</h2>
              </div>
              <Link
                href="/mybusiness"
                className="text-sm font-medium text-[#2563EB] hover:underline"
              >
                Edit
              </Link>
            </div>
            <div className="mt-3 rounded-xl bg-blue-50 p-4">
              {categoryName ? (
                <>
                  <p className="mt-1 font-semibold text-gray-900">{categoryName}</p>
                  {categorySlug && <p className="text-sm text-gray-600">{categorySlug}</p>}
                </>
              ) : (
                <p className="text-gray-500">Not selected</p>
              )}
            </div>
          </section>

          {/* Business Details - no Registration / Company Size */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiInfo className="h-5 w-5 text-[#2563EB]" />
                <h2 className="font-semibold text-gray-900">Business Details</h2>
              </div>
              <Link
                href="/mybusiness/details"
                className="text-sm font-medium text-[#2563EB] hover:underline"
              >
                Edit
              </Link>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Company Name
                </p>
                <p className="text-gray-900">{state.details.legalName || '—'}</p>
              </div>
              {state.details.tradingName && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Trading Name
                  </p>
                  <p className="text-gray-900">{state.details.tradingName}</p>
                </div>
              )}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Contact Email
                </p>
                <p className="text-gray-900">{state.details.email || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Phone
                </p>
                <p className="text-gray-900">{state.details.phone || '—'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Website
                </p>
                {state.details.website ? (
                  <a
                    href={`https://${state.details.website.replace(/^https?:\/\//, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#2563EB] hover:underline"
                  >
                    {state.details.website}
                  </a>
                ) : (
                  <p className="text-gray-500">—</p>
                )}
              </div>
            </div>
          </section>

          {/* Location - with map preview and Location Verified */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiMapPin className="h-5 w-5 text-[#2563EB]" />
                <h2 className="font-semibold text-gray-900">Location</h2>
              </div>
              <Link
                href="/mybusiness/location"
                className="text-sm font-medium text-[#2563EB] hover:underline"
              >
                Edit
              </Link>
            </div>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  Physical Address
                </p>
                <p className="text-gray-900">
                  {state.location.noPhysicalLocation
                    ? 'No physical location'
                    : addressLine || '—'}
                </p>
              </div>
              <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 sm:h-28 sm:w-48">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-1 text-gray-500">
                    <FiMapPin className="h-8 w-8 text-[#2563EB]" />
                    {hasAddress ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Location Verified
                      </span>
                    ) : (
                      <span className="text-xs">Map preview</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Operating Hours */}
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiClock className="h-5 w-5 text-[#2563EB]" />
                <h2 className="font-semibold text-gray-900">Operating Hours</h2>
              </div>
              <span className="text-sm text-gray-500">Edit in profile</span>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Mon–Fri: 9:00 AM – 6:00 PM · Set after approval
            </p>
          </section>

          {/* Terms */}
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <input
              type="checkbox"
              checked={state.agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB]"
            />
            <span className="text-sm text-gray-600">
              I agree to the{' '}
              <Link href="/terms" className="text-[#2563EB] hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-[#2563EB] hover:underline">
                Privacy Policy
              </Link>
              . I certify that all information provided is accurate and I am
              authorized to register this business.
            </span>
          </label>
        </div>

        {/* Progress saved + Actions */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Progress automatically saved.
        </p>

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="order-2 inline-flex items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-70 sm:order-1"
          >
            {submitting ? 'Submitting...' : 'Submit Business Profile'}
          </button>
          <button
            type="button"
            onClick={handleSaveDraft}
            className="order-1 inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 sm:order-2"
          >
            Save as Draft
          </button>
        </div>

        <p className="mt-4 text-center text-sm text-gray-500">
          Review may take 2–3 business days. You will be notified via email once
          approved.
        </p>
      </main>

      <div className="h-24" />
    </div>
  );
}
