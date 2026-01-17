'use client';

import Link from 'next/link';
import { FiFileText, FiShield, FiAlertCircle, FiMessageCircle } from 'react-icons/fi';

export default function TermsOfService() {
  const sections = [
    {
      title: '1. Acceptance of Terms',
      content: 'By accessing and using SellIt, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our services.'
    },
    {
      title: '2. User Accounts',
      content: 'You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account.'
    },
    {
      title: '3. Listing and Selling',
      content: 'Users may list items for sale on our platform. All listings must comply with local laws and regulations. SellIt reserves the right to remove any listing that violates our policies or applicable laws. Sellers are responsible for the accuracy of their listings and for fulfilling their obligations to buyers.'
    },
    {
      title: '4. Prohibited Items',
      content: 'Users may not list illegal items, counterfeit goods, stolen property, weapons, drugs, or any items that violate intellectual property rights. Violation of this policy may result in account suspension or termination.'
    },
    {
      title: '5. Payments and Fees',
      content: 'SellIt may charge fees for certain services, including premium listings and featured ads. All fees are clearly displayed before purchase. Payments are processed securely through our payment partners. Users are responsible for any applicable taxes.'
    },
    {
      title: '6. User Conduct',
      content: 'Users agree to use the platform responsibly and not engage in fraudulent activity, harassment, spam, or any behavior that disrupts the platform or harms other users. We reserve the right to suspend or terminate accounts that violate these terms.'
    },
    {
      title: '7. Content Rights',
      content: 'By posting content on SellIt, you grant us a non-exclusive, worldwide, royalty-free license to use, display, and distribute your content on our platform. You retain all ownership rights to your content and can remove it at any time.'
    },
    {
      title: '8. Disclaimer of Warranties',
      content: 'SellIt is provided "as is" without warranties of any kind. We do not guarantee that the service will be uninterrupted, secure, or error-free. We are not responsible for transactions between users.'
    },
    {
      title: '9. Limitation of Liability',
      content: 'SellIt and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the service. Our total liability shall not exceed the amount you paid us in the past 12 months.'
    },
    {
      title: '10. Dispute Resolution',
      content: 'Disputes between users should be resolved directly between the parties involved. SellIt may provide mediation services but is not obligated to do so. Any disputes with SellIt shall be resolved through binding arbitration.'
    },
    {
      title: '11. Privacy',
      content: 'Your use of SellIt is also governed by our Privacy Policy. Please review our Privacy Policy to understand how we collect, use, and protect your personal information.'
    },
    {
      title: '12. Changes to Terms',
      content: 'We reserve the right to modify these terms at any time. We will notify users of significant changes via email or platform notification. Continued use of the service after changes constitutes acceptance of the new terms.'
    },
    {
      title: '13. Termination',
      content: 'We may terminate or suspend your account at any time for violation of these terms. Upon termination, your right to use the service will immediately cease. You may also terminate your account at any time through your account settings.'
    },
    {
      title: '14. Governing Law',
      content: 'These terms shall be governed by and construed in accordance with the laws of the jurisdiction in which SellIt operates, without regard to its conflict of law provisions.'
    },
    {
      title: '15. Contact Information',
      content: 'If you have any questions about these Terms of Service, please contact us at legal@sellit.com or through our Contact Us page.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Hero */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiFileText className="w-12 h-12" />
              <h1 className="text-5xl font-bold">Terms of Service</h1>
            </div>
            <p className="text-xl text-white mb-6">
              Last updated: January 2026
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-white">
                Please read these terms carefully before using SellIt. By using our platform, you agree to be bound by these terms.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Quick Links */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-6 mb-8">
            <h3 className="font-bold text-white mb-4">Quick Navigation</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sections.slice(0, 6).map((section, idx) => (
                <a
                  key={idx}
                  href={`#section-${idx}`}
                  className="text-sm text-white hover:underline"
                >
                  {section.title}
                </a>
              ))}
            </div>
          </div>

          {/* Terms Content */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-8 mb-8">
            <div className="space-y-8">
              {sections.map((section, idx) => (
                <div key={idx} id={`section-${idx}`} className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-white mb-4">{section.title}</h2>
                  <p className="text-white leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-950/30 border border-yellow-900/40 border-l-4 border-yellow-500 rounded-lg p-6 mb-8">
            <div className="flex items-start gap-3">
              <FiAlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-white mb-2">Important Notice</h3>
                <p className="text-sm text-white">
                  These terms constitute a legally binding agreement between you and SellIt. If you do not agree with any part of these terms, you must not use our services. For questions or concerns, please contact our legal team at legal@sellit.com.
                </p>
              </div>
            </div>
          </div>

          {/* Related Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/privacy"
              className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                <FiShield className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white mb-2">Privacy Policy</h3>
              <p className="text-sm text-white">Learn how we protect your data</p>
            </Link>

            <Link
              href="/help"
              className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                <FiFileText className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white mb-2">Help Center</h3>
              <p className="text-sm text-white">Find answers to your questions</p>
            </Link>

            <Link
              href="/contact"
              className="bg-slate-900 border border-slate-800 rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center mb-4">
                <FiMessageCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-bold text-white mb-2">Contact Us</h3>
              <p className="text-sm text-white">Get in touch with our team</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

