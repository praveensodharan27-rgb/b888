import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Edit Ad | Sell Box',
  description: 'Edit your classified listing on Sell Box.',
  robots: 'noindex, nofollow',
};

export default function EditAdLayout({ children }: { children: React.ReactNode }) {
  return children;
}
