'use client';

import Link from 'next/link';
import { FiShield, FiLock, FiEye, FiDatabase, FiUserCheck, FiFileText, FiMessageCircle } from 'react-icons/fi';

export default function PrivacyPolicy() {
  const sections = [
    {
      title: '1. Information We Collect',
      content: 'We collect information you provide directly to us, including your name, email address, phone number, profile information, and listings. We also collect information about your use of our services, including your IP address, browser type, device information, and usage patterns.'
    },
    {
      title: '2. How We Use Your Information',
      content: 'We use your information to provide, maintain, and improve our services; to process your transactions; to send you updates and marketing communications (with your consent); to respond to your requests; and to protect against fraud and abuse.'
    },
    {
      title: '3. Information Sharing',
      content: 'We do not sell your personal information. We may share your information with service providers who help us operate our platform, with other users as necessary for transactions, and when required by law or to protect our rights.'
    },
    {
      title: '4. Cookies and Tracking',
      content: 'We use cookies and similar tracking technologies to collect information about your browsing activities. You can control cookies through your browser settings. Some features may not work properly if you disable cookies.'
    },
    {
      title: '5. Data Security',
      content: 'We implement appropriate technical and organizational measures to protect your personal information. However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security of your data.'
    },
    {
      title: '6. Your Rights',
      content: 'You have the right to access, correct, or delete your personal information. You can update your information through your account settings or contact us for assistance. You also have the right to opt-out of marketing communications.'
    },
    {
      title: '7. Data Retention',
      content: 'We retain your information for as long as your account is active or as needed to provide services. We may retain certain information for legal, regulatory, or legitimate business purposes even after account closure.'
    },
    {
      title: '8. Children\'s Privacy',
      content: 'Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware of such collection, we will take steps to delete the information.'
    },
    {
      title: '9. Third-Party Links',
      content: 'Our platform may contain links to third-party websites. We are not responsible for the privacy practices of these external sites. We encourage you to read their privacy policies before providing any information.'
    },
    {
      title: '10. International Transfers',
      content: 'Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using our service, you consent to such transfers.'
    },
    {
      title: '11. Changes to Privacy Policy',
      content: 'We may update this privacy policy from time to time. We will notify you of significant changes via email or platform notification. Your continued use after changes indicates acceptance of the updated policy.'
    },
    {
      title: '12. Contact Us',
      content: 'If you have questions about this Privacy Policy, please contact us at privacy@sellit.com or through our Contact Us page.'
    }
  ];

  const dataTypes = [
    { icon: FiUserCheck, title: 'Account Data', desc: 'Name, email, phone, password' },
    { icon: FiDatabase, title: 'Usage Data', desc: 'Browsing history, search queries' },
    { icon: FiEye, title: 'Device Data', desc: 'IP address, browser, device info' },
    { icon: FiLock, title: 'Transaction Data', desc: 'Purchase history, preferences' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <FiShield className="w-12 h-12" />
              <h1 className="text-5xl font-bold">Privacy Policy</h1>
            </div>
            <p className="text-xl text-blue-100 mb-6">
              Last updated: January 2026
            </p>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <p className="text-sm text-gray-200">
                Your privacy is important to us. This policy explains how we collect, use, and protect your personal information.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Data We Collect */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {dataTypes.map((type, idx) => {
              const Icon = type.icon;
              return (
                <div key={idx} className="bg-white rounded-xl shadow-md p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 mb-1 text-sm">{type.title}</h3>
                  <p className="text-xs text-gray-600">{type.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Privacy Content */}
          <div className="bg-white rounded-xl shadow-md p-8 mb-8">
            <div className="space-y-8">
              {sections.map((section, idx) => (
                <div key={idx} className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">{section.title}</h2>
                  <p className="text-gray-700 leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Your Rights Card */}
          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-8 mb-8">
            <h3 className="text-2xl font-bold text-blue-900 mb-4">Your Privacy Rights</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Access Your Data</p>
                  <p className="text-sm text-blue-800">Request a copy of your personal information</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Correct Information</p>
                  <p className="text-sm text-blue-800">Update or correct your personal data</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Delete Your Data</p>
                  <p className="text-sm text-blue-800">Request deletion of your account and data</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-white text-xs">✓</span>
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Opt-Out</p>
                  <p className="text-sm text-blue-800">Unsubscribe from marketing emails</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact for Privacy */}
          <div className="bg-white rounded-xl shadow-md p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Questions About Your Privacy?</h3>
            <p className="text-gray-700 mb-6">
              If you have any questions about this Privacy Policy or how we handle your data, please don't hesitate to contact us.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/contact"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                Contact Privacy Team
              </Link>
              <Link
                href="/help"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
              >
                Visit Help Center
              </Link>
            </div>
          </div>

          {/* Related Links */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link
              href="/terms"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-3">
                <FiFileText className="w-8 h-8 text-gray-700" />
                <h3 className="font-bold text-gray-900">Terms of Service</h3>
              </div>
              <p className="text-sm text-gray-600">Read our terms and conditions →</p>
            </Link>

            <Link
              href="/help"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all hover:-translate-y-1"
            >
              <div className="flex items-center gap-3 mb-3">
                <FiShield className="w-8 h-8 text-gray-700" />
                <h3 className="font-bold text-gray-900">Security Center</h3>
              </div>
              <p className="text-sm text-gray-600">Learn about our security measures →</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

