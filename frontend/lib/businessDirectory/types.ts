/**
 * Types for Business Directory onboarding and public profile.
 */

export type BusinessCategoryId =
  | 'retail'
  | 'food-beverage'
  | 'technology'
  | 'healthcare'
  | 'professional-services'
  | 'construction';

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+';

export interface BusinessWizardState {
  step: number;
  /** Directory category slug (e.g. retail, spa, restaurants) */
  category: BusinessCategoryId | string | null;
  /** Display name for selected category */
  categoryName?: string;
  details: {
    legalName: string;
    tradingName: string;
    registrationNumber: string;
    companySize: CompanySize | '';
    website: string;
    phone: string;
    email: string;
  };
  location: {
    street: string;
    building: string;
    city: string;
    state: string;
    postalCode: string;
    noPhysicalLocation: boolean;
    lat?: number;
    lng?: number;
  };
  operatingHours: Record<string, { open: string; close: string } | 'closed'>;
  agreedToTerms: boolean;
}

export const INITIAL_WIZARD_STATE: BusinessWizardState = {
  step: 1,
  category: null,
  details: {
    legalName: '',
    tradingName: '',
    registrationNumber: '',
    companySize: '',
    website: '',
    phone: '',
    email: '',
  },
  location: {
    street: '',
    building: '',
    city: '',
    state: '',
    postalCode: '',
    noPhysicalLocation: false,
  },
  operatingHours: {},
  agreedToTerms: false,
};

export interface BusinessCategory {
  id: BusinessCategoryId;
  name: string;
  description: string;
  icon: string;
}

export const BUSINESS_CATEGORIES: BusinessCategory[] = [
  {
    id: 'retail',
    name: 'Retail',
    description: 'E-commerce, boutique shops, and consumer goods distribution.',
    icon: '🛍️',
  },
  {
    id: 'food-beverage',
    name: 'Food & Beverage',
    description: 'Restaurants, catering, cafes, and beverage manufacturers.',
    icon: '🍴',
  },
  {
    id: 'technology',
    name: 'Technology',
    description: 'SaaS, fintech, IT infrastructure, and digital products.',
    icon: '💻',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Clinics, wellness centers, biotech, and medical services.',
    icon: '⚕️',
  },
  {
    id: 'professional-services',
    name: 'Professional Services',
    description: 'Consulting, legal, accounting, and creative agencies.',
    icon: '💼',
  },
  {
    id: 'construction',
    name: 'Construction',
    description: 'Engineering, trade crafts, real estate, and architecture.',
    icon: '🔧',
  },
];
