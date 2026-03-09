'use client';

import ServicesHomeClient from '@/app/services/ServicesHomeClient';

type Props = {
  locationSlug: string;
  locationName: string;
};

export default function ServicesWithLocationClient({ locationSlug, locationName }: Props) {
  return (
    <ServicesHomeClient
      locationSlugFromUrl={locationSlug}
      locationNameFromUrl={locationName}
    />
  );
}
