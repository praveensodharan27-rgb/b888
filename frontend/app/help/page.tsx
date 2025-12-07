'use client';

import Link from 'next/link';
import { FiSearch, FiMessageCircle, FiMail, FiBook, FiHelpCircle, FiShoppingBag, FiUsers, FiSettings } from 'react-icons/fi';
import { useState } from 'react';

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    {
      icon: FiShoppingBag,
      title: 'Buying & Selling',
      description: 'Learn how to buy and sell on SellIt',
      color: 'blue',
      articles: [
        'How to post an ad',
        'How to buy items safely',
        'Payment methods',
        'Shipping guidelines'
      ]
    },
    {
      icon: FiUsers,
      title: 'Account & Profile',
      description: 'Manage your account settings',
      color: 'purple',
      articles: [
        'Create an account',
        'Update your profile',
        'Verify your account',
        'Reset password'
      ]
    },
    {
      icon: FiSettings,
      title: 'Safety & Security',
      description: 'Stay safe while trading',
      color: 'green',
      articles: [
        'Safety tips',
        'Report suspicious activity',
        'Secure payments',
        'Fraud prevention'
      ]
    },
    {
      icon: FiBook,
      title: 'Getting Started',
      description: 'New to SellIt? Start here',
      color: 'orange',
      articles: [
        'Platform overview',
        'First time seller guide',
        'First time buyer guide',
        'Community guidelines'
      ]
    }
  ];

  const faqs = [
    {
      question: 'How do I post an ad?',
      answer: 'Click the "Post Ad" button in the navbar, fill in your item details, upload photos, and submit. Your ad will be reviewed and published within 24 hours.'
    },
    {
      question: 'Is it free to use SellIt?',
      answer: 'Yes! Posting your first 2 ads is completely free. Additional ads may have a small posting fee to maintain quality.'
    },
    {
      question: 'How do I contact a seller?',
      answer: 'Click on any listing to view details, then use the "Contact Seller" button to send a message directly through our chat system.'
    },
    {
      question: 'What payment methods are accepted?',
      answer: 'We support various payment methods including cash, bank transfer, and online payments. Always use secure payment methods and avoid sharing sensitive information.'
    },
    {
      question: 'How do I report a suspicious listing?',
      answer: 'Click the flag icon on any listing to report it. Our moderation team will review it within 24 hours.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-5xl font-bold mb-4">How can we help you?</h1>
            <p className="text-xl text-blue-100 mb-8">
              Search our help center or browse categories below
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-2xl mx-auto">
              <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for answers..."
                className="w-full pl-12 pr-4 py-4 rounded-xl text-gray-900 shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 -mt-8">
          <Link
            href="/contact"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <FiMail className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Contact Support</h3>
            <p className="text-sm text-gray-600">Get help from our support team</p>
          </Link>

          <Link
            href="/chat"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <FiMessageCircle className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Live Chat</h3>
            <p className="text-sm text-gray-600">Chat with us in real-time</p>
          </Link>

          <Link
            href="#faqs"
            className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <FiHelpCircle className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">FAQs</h3>
            <p className="text-sm text-gray-600">Quick answers to common questions</p>
          </Link>
        </div>

        {/* Categories */}
        <div className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Browse by Category</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => {
              const Icon = category.icon;
              const colorClasses = {
                blue: 'from-blue-500 to-blue-600',
                purple: 'from-purple-500 to-purple-600',
                green: 'from-green-500 to-green-600',
                orange: 'from-orange-500 to-orange-600'
              };

              return (
                <div key={category.title} className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all">
                  <div className={`w-14 h-14 bg-gradient-to-br ${colorClasses[category.color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{category.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{category.description}</p>
                  <ul className="space-y-2">
                    {category.articles.map((article, idx) => (
                      <li key={idx}>
                        <a href="#" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                          → {article}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQs */}
        <div id="faqs" className="bg-white rounded-xl shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-6 last:border-0">
                <h3 className="text-lg font-bold text-gray-900 mb-3">{faq.question}</h3>
                <p className="text-gray-700">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Still Need Help? */}
        <div className="mt-12 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Still need help?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Our support team is here to assist you
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/contact"
              className="px-8 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
            >
              Contact Support
            </Link>
            <Link
              href="/"
              className="px-8 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-400 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

