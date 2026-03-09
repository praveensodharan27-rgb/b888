import { Metadata } from 'next';
import { getBaseUrl } from '@/lib/seo';
import ServicesPageClient from './ServicesPageClient';

export const metadata: Metadata = {
  title: 'Services | Find Local Plumbers, Electricians & More',
  description: 'Find the best local services – plumbers, electricians, cleaning, AC repair, painters and more. JustDial-style local search.',
  openGraph: {
    title: 'Services | Find Local Service Providers',
    description: 'Find plumbers, electricians, cleaning, AC repair and more near you.',
    type: 'website',
    url: `${getBaseUrl()}/services`,
  },
};

export default function ServicesPage() {
  return <ServicesPageClient />;
}
