/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        /* Primary – synced with globals.css; change --color-primary in :root to rebrand */
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: 'var(--color-primary, #2563eb)',
          600: 'var(--color-primary-hover, #1d4ed8)',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
        },
        /* Secondary (yellow) – badges, ratings, offers; not for long text or primary buttons */
        secondary: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        /* Semantic – use with bg/ and -dark for text on light bg */
        success: { DEFAULT: '#16a34a', bg: '#ecfdf3', dark: '#14532d' },
        error: { DEFAULT: '#dc2626', bg: '#fef2f2', dark: '#7f1d1d' },
        warning: { DEFAULT: '#f59e0b', bg: '#fffbeb', dark: '#78350f' },
        info: { DEFAULT: '#0284c7', bg: '#eff6ff', dark: '#0f172a' },
        /* Background tokens */
        bg: {
          page: '#f3f4f6',
          card: '#ffffff',
          subtle: '#f9fafb',
          hover: '#f3f4ff',
          highlight: '#eff6ff',
        },
        border: { subtle: '#e5e7eb', strong: '#d1d5db', focus: 'var(--color-primary, #2563eb)' },
        /* Text tokens (WCAG-friendly) */
        text: {
          primary: '#111827',
          secondary: '#1f2937',
          muted: '#6b7280',
          disabled: '#9ca3af',
          invert: '#ffffff',
        },
        'background-light': '#f3f4f6',
        'background-dark': '#0b1120',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      /* 8px type scale: 8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48 */
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.4' }],
        xs: ['12px', { lineHeight: '1.4' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.35' }],
        '3xl': ['28px', { lineHeight: '1.3' }],
        '4xl': ['32px', { lineHeight: '1.25' }],
        '5xl': ['40px', { lineHeight: '1.2' }],
        '6xl': ['48px', { lineHeight: '1.15' }],
        '7xl': ['56px', { lineHeight: '1.1' }],
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        lg: '0.5rem',
        xl: '0.75rem',
        full: '9999px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 1s ease-out',
        'fade-in-up-delay': 'fadeInUp 1s ease-out 0.3s both',
        'fade-in-scale': 'fadeInScale 0.35s ease-out',
      },
      keyframes: {
        fadeInUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        fadeInScale: {
          '0%': {
            opacity: '0',
            transform: 'scale(0.92) translateY(6px)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
          },
        },
      },
    },
  },
  plugins: [],
}

