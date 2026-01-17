'use client';

import Link from 'next/link';
import {
  FiArrowRight,
  FiGlobe,
  FiHeart,
  FiBookOpen,
  FiCheckCircle,
  FiUpload,
  FiFileText,
} from 'react-icons/fi';
import { useMemo, useRef, useState } from 'react';

export default function CareersPage() {
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    message: '',
  });

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
  }>({});

  const emailIsValid = (email: string) => {
    // Simple, practical email validation (avoids overly strict RFC rules)
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  };

  const phoneIsValid = (phone: string) => {
    // Allow common symbols; validate by digit count
    const digits = phone.replace(/[^\d]/g, '');
    return digits.length >= 7 && digits.length <= 15;
  };

  const validate = () => {
    const next: typeof errors = {};

    if (!form.fullName.trim()) next.fullName = 'Full name is required.';

    if (!form.email.trim()) next.email = 'Email address is required.';
    else if (!emailIsValid(form.email)) next.email = 'Enter a valid email address.';

    if (!form.phone.trim()) next.phone = 'Phone number is required.';
    else if (!phoneIsValid(form.phone)) next.phone = 'Enter a valid phone number.';

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const resumeLabel = useMemo(() => {
    if (!resumeFile) return 'Click to upload or drag and drop';
    return resumeFile.name;
  }, [resumeFile]);

  const onPickResume = () => fileInputRef.current?.click();

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) setResumeFile(f);
  };

  const onSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    // Dummy submit (UI only)
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);
    setForm({ fullName: '', email: '', phone: '', message: '' });
    setResumeFile(null);
    setErrors({});
    setSuccessOpen(true);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Success Modal */}
      {successOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          role="dialog"
          aria-modal="true"
          aria-label="Application submitted successfully"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSuccessOpen(false);
          }}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-emerald-50">
                <FiCheckCircle className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-extrabold text-gray-900">Success</div>
                <div className="mt-1 text-sm text-gray-600">
                  Application submitted successfully. Our team will contact you if there&apos;s a match.
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setSuccessOpen(false)}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
              <Link
                href="/contact"
                onClick={() => setSuccessOpen(false)}
                className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Contact Us <FiArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hero card (screenshot-style) */}
      <section className="px-4 pt-10 pb-14">
        <div className="mx-auto max-w-6xl">
          <div className="relative overflow-hidden rounded-2xl border border-blue-100 shadow-xl">
            {/* Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800" />
            <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.22),rgba(0,0,0,0.35))]" />

            {/* Content */}
            <div className="relative px-6 py-14 sm:px-10 sm:py-16">
              <div className="mx-auto max-w-3xl text-center text-white">
                <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">Join Our Team</h1>
                <p className="mt-4 text-sm leading-6 text-blue-100 sm:text-base">
                  Building the future of local commerce for millions of users worldwide. Help us
                  <br className="hidden sm:block" />
                  connect people through technology.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <a
                    href="#general-application"
                    className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-sm font-semibold text-blue-700 shadow-sm hover:bg-blue-50"
                  >
                    Join Our Talent Pool
                  </a>
                  <Link
                    href="/contact"
                    className="inline-flex items-center justify-center rounded-md border border-white/30 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15"
                  >
                    Contact Us <FiArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Work Culture */}
      <section className="bg-white px-4 py-14">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-extrabold text-gray-900">Work Culture</h2>
          <p className="mt-3 max-w-2xl text-sm text-gray-600">
            We empower our employees with the tools and flexibility to do their best work and
            <br className="hidden sm:block" />
            live their best lives.
          </p>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              {
                title: 'Remote Work',
                desc: 'Flexible arrangements for a better work-life balance from anywhere.',
                icon: FiGlobe,
              },
              {
                title: 'Health Insurance',
                desc: 'Comprehensive medical, dental, and vision coverage for you and your family.',
                icon: FiHeart,
              },
              {
                title: 'Learning Budget',
                desc: 'Annual stipend for certifications, professional growth, and skills improvement.',
                icon: FiBookOpen,
              },
            ].map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="mt-5 text-sm font-extrabold text-gray-900">{c.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{c.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* General Application */}
      <section id="general-application" className="bg-gray-50 px-4 py-16 scroll-mt-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">General Application</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-gray-600">
              Don&apos;t see a specific role that fits? Send us your details and we&apos;ll keep you in mind for
              future opportunities.
            </p>
          </div>

          <div className="mt-10 flex justify-center">
            <form onSubmit={onSubmit} className="w-full max-w-2xl">
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Full Name</label>
                    <input
                      value={form.fullName}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, fullName: e.target.value }));
                        if (errors.fullName) setErrors((p) => ({ ...p, fullName: undefined }));
                      }}
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? 'careers-fullName-error' : undefined}
                      placeholder="John Doe"
                      className={[
                        'mt-2 w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
                        errors.fullName ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200',
                      ].join(' ')}
                    />
                    {errors.fullName ? (
                      <p id="careers-fullName-error" className="mt-2 text-xs font-semibold text-red-600">
                        {errors.fullName}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700">Email Address</label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => {
                        setForm((p) => ({ ...p, email: e.target.value }));
                        if (errors.email) setErrors((p) => ({ ...p, email: undefined }));
                      }}
                      onBlur={() => {
                        if (!form.email.trim()) return;
                        if (!emailIsValid(form.email)) setErrors((p) => ({ ...p, email: 'Enter a valid email address.' }));
                      }}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'careers-email-error' : undefined}
                      placeholder="john@example.com"
                      className={[
                        'mt-2 w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
                        errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200',
                      ].join(' ')}
                    />
                    {errors.email ? (
                      <p id="careers-email-error" className="mt-2 text-xs font-semibold text-red-600">
                        {errors.email}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5">
                  <label className="text-xs font-semibold text-gray-700">Phone Number</label>
                  <input
                    value={form.phone}
                    onChange={(e) => {
                      setForm((p) => ({ ...p, phone: e.target.value }));
                      if (errors.phone) setErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    onBlur={() => {
                      if (!form.phone.trim()) return;
                      if (!phoneIsValid(form.phone)) setErrors((p) => ({ ...p, phone: 'Enter a valid phone number.' }));
                    }}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'careers-phone-error' : undefined}
                    placeholder="+1 (555) 000-0000"
                    className={[
                      'mt-2 w-full rounded-lg border px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200',
                      errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200',
                    ].join(' ')}
                  />
                  {errors.phone ? (
                    <p id="careers-phone-error" className="mt-2 text-xs font-semibold text-red-600">
                      {errors.phone}
                    </p>
                  ) : null}
                </div>

                <div className="mt-6">
                  <label className="text-xs font-semibold text-gray-700">Upload CV/Resume</label>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
                  />

                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    onClick={onPickResume}
                    role="button"
                    tabIndex={0}
                    className="mt-3 cursor-pointer rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center hover:border-blue-300"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') onPickResume();
                    }}
                  >
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                      {resumeFile ? (
                        <FiFileText className="h-6 w-6 text-blue-600" />
                      ) : (
                        <FiUpload className="h-6 w-6 text-blue-600" />
                      )}
                    </div>
                    <div className="mt-4 text-sm font-semibold text-gray-900">{resumeLabel}</div>
                    <div className="mt-1 text-xs text-gray-500">PDF, DOCX, or DOC (max. 10MB)</div>
                  </div>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-semibold text-gray-700">Message/Details</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                    placeholder="Tell us about yourself and what you're looking for..."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="mt-8 w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

