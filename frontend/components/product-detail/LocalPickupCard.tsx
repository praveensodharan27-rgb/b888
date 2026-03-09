'use client';

import { FiMapPin } from 'react-icons/fi';

interface LocalPickupCardProps {
  /** City name – no map shown, only city + message per UX spec */
  city?: string | null;
}

export function LocalPickupCard({ city }: LocalPickupCardProps) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="text-base font-bold text-gray-900 mb-4">
        Local Pickup Location
      </h2>
      <div className="flex items-start gap-3 p-4 rounded-xl bg-gray-50">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary-50 shrink-0">
          <FiMapPin className="w-5 h-5 text-primary-600" />
        </span>
        <div>
          {city ? (
            <>
              <p className="text-gray-900 font-medium">{city}</p>
              <p className="text-sm text-gray-500 mt-1">
                Exact location shared after contact
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Location shared after contact
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
