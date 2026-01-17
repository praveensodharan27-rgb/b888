'use client';

import { useState } from 'react';
import { FiArrowRight, FiMail, FiMapPin, FiPhone } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function ContactUs() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);

    // Simulate submission
    setTimeout(() => {
      toast.success("Message sent successfully! We'll get back to you soon.");
      setFormData({ name: '', email: '', subject: '', message: '' });
      setSubmitting(false);
    }, 1500);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-14 lg:py-20">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left: Info */}
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Get in touch</h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
              We&apos;d love to hear from you about your sustainability goals. Let&apos;s grow
              <br />
              a greener future together.
            </p>

            <div className="mt-10 space-y-9">
              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md text-emerald-600">
                  <FiMail className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Email</div>
                  <a
                    href="mailto:hello@ognox.com"
                    className="mt-1 block text-sm text-slate-600 hover:text-slate-800"
                  >
                    hello@ognox.com
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md text-emerald-600">
                  <FiPhone className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Call</div>
                  <a
                    href="tel:9988994282"
                    className="mt-1 block text-sm text-slate-600 hover:text-slate-800"
                  >
                    9988994282
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-md text-emerald-600">
                  <FiMapPin className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-900">Visit</div>
                  <div className="mt-1 text-sm text-slate-600">
                    Ernakulam Forest Lane
                    <br />
                    Green Valley, CA 94000
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 border-t border-gray-200 pt-6">
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-emerald-600 hover:text-emerald-700">Instagram</a>
                <a href="#" className="text-emerald-600 hover:text-emerald-700">Twitter</a>
                <a href="#" className="text-emerald-600 hover:text-emerald-700">LinkedIn</a>
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="lg:pl-6">
            <form onSubmit={handleSubmit} className="space-y-10">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-semibold tracking-widest text-slate-500">FULL NAME</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    placeholder="Jane Doe"
                    className="mt-3 w-full border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold tracking-widest text-slate-500">EMAIL ADDRESS</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="jane@example.com"
                    className="mt-3 w-full border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-widest text-slate-500">SUBJECT</label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  placeholder="Partnership Inquiry"
                  className="mt-3 w-full border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-widest text-slate-500">HOW CAN WE HELP?</label>
                <textarea
                  required
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  placeholder="Tell us about your project..."
                  rows={6}
                  className="mt-3 w-full resize-none border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-900 placeholder:text-slate-300 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-10 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? 'Sending...' : 'Send Message'}
                  {!submitting && <FiArrowRight className="h-4 w-4" />}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

