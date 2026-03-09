'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FiMapPin } from 'react-icons/fi';
import { CONTENT_CONTAINER_CLASS } from '@/lib/layoutConstants';
import { useBusinessWizard } from '@/contexts/BusinessWizardContext';
import StepIndicator from '@/components/business-directory/StepIndicator';
import BusinessWizardFooter from '@/components/business-directory/BusinessWizardFooter';
import AddressPlaceInput from '@/components/business-directory/AddressPlaceInput';
import BusinessLocationMap from '@/components/business-directory/BusinessLocationMap';

const inputClass =
  'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-gray-900 shadow-sm outline-none transition-all placeholder:text-gray-400 focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function BusinessLocationPage() {
  const router = useRouter();
  const { state, setLocation, persist } = useBusinessWizard();
  const [street, setStreet] = useState(state.location.street);
  const [building, setBuilding] = useState(state.location.building);
  const [city, setCity] = useState(state.location.city);
  const [stateVal, setStateVal] = useState(state.location.state);
  const [postalCode, setPostalCode] = useState(state.location.postalCode);
  const [noPhysical, setNoPhysical] = useState(state.location.noPhysicalLocation);
  const [lat, setLat] = useState<number | undefined>(state.location.lat);
  const [lng, setLng] = useState<number | undefined>(state.location.lng);

  const handleAddressSelect = useCallback(
    (result: { lat: number; lng: number; street: string; city: string; state: string; postalCode: string }) => {
      setStreet(result.street);
      setCity(result.city);
      setStateVal(result.state);
      setPostalCode(result.postalCode);
      setLat(result.lat);
      setLng(result.lng);
      setLocation({
        street: result.street,
        city: result.city,
        state: result.state,
        postalCode: result.postalCode,
        lat: result.lat,
        lng: result.lng,
      });
    },
    [setLocation]
  );

  const handleMapClick = useCallback(
    (newLat: number, newLng: number) => {
      setLat(newLat);
      setLng(newLng);
      setLocation({ lat: newLat, lng: newLng });
    },
    [setLocation]
  );

  const handleSync = () => {
    setLocation({
      street,
      building,
      city,
      state: stateVal,
      postalCode,
      noPhysicalLocation: noPhysical,
      lat,
      lng,
    });
  };

  const handleContinue = () => {
    handleSync();
    persist();
    router.push('/mybusiness/review');
  };

  const handleBack = () => router.push('/mybusiness/details');

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className={CONTENT_CONTAINER_CLASS}>
          <div className="flex items-center justify-between gap-4 py-4">
            <button
              type="button"
              onClick={handleBack}
              className="text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              ← Back
            </button>
            <div className="flex-1 flex justify-center">
              <StepIndicator currentStep={3} totalSteps={4} />
            </div>
            <span className="w-16 text-right text-sm font-medium text-gray-500">
              Step 3 of 4
            </span>
          </div>
        </div>
      </header>

      <main className={CONTENT_CONTAINER_CLASS + ' py-8 sm:py-10'}>
        <div className="grid gap-8 lg:grid-cols-[1fr,400px]">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg sm:p-8">
            <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
              Where is your business located?
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Provide your physical business address. You can change this later in settings.
            </p>

            {!noPhysical && (
              <div className="mt-6">
                <label className={labelClass}>Search address on map</label>
                <AddressPlaceInput
                  onSelect={handleAddressSelect}
                  placeholder="Search address or place…"
                  className="[&_input]:rounded-xl [&_input]:border-gray-200 [&_input]:py-2.5"
                />
              </div>
            )}

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="street" className={labelClass}>
                  Street Address
                </label>
                <div className="relative">
                  <FiMapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="street"
                    type="text"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder="e.g. 123 Business Avenue"
                    className={inputClass + ' pl-10'}
                    disabled={noPhysical}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="building" className={labelClass}>
                  Building / Suite (Optional)
                </label>
                <input
                  id="building"
                  type="text"
                  value={building}
                  onChange={(e) => setBuilding(e.target.value)}
                  placeholder="e.g. Suite 405"
                  className={inputClass}
                  disabled={noPhysical}
                />
              </div>

              <div>
                <label htmlFor="city" className={labelClass}>
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Mumbai"
                  className={inputClass}
                  disabled={noPhysical}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="state" className={labelClass}>
                    State / Province
                  </label>
                  <select
                    id="state"
                    value={stateVal}
                    onChange={(e) => setStateVal(e.target.value)}
                    className={inputClass}
                    disabled={noPhysical}
                  >
                    <option value="">Select state</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                    <option value="Kerala">Kerala</option>
                    <option value="Delhi">Delhi</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="postalCode" className={labelClass}>
                    Postal Code
                  </label>
                  <input
                    id="postalCode"
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="e.g. 400001"
                    className={inputClass}
                    disabled={noPhysical}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">I don&apos;t have a physical location</p>
                    <p className="text-sm text-gray-500">For digital or service-area based businesses.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={noPhysical}
                    onClick={() => setNoPhysical(!noPhysical)}
                    className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 ${
                      noPhysical ? 'border-[#2563EB] bg-[#2563EB]' : 'border-gray-300 bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                        noPhysical ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="order-first lg:order-last">
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3] lg:aspect-square">
              {noPhysical ? (
                <div className="flex h-full min-h-[280px] w-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-100 text-gray-500">
                  <div className="text-center">
                    <FiMapPin className="mx-auto h-12 w-12 text-[#2563EB]" />
                    <p className="mt-2 text-sm font-medium">No physical location</p>
                    <p className="text-xs text-gray-500">Toggle above if you have an address</p>
                  </div>
                </div>
              ) : (
                <BusinessLocationMap
                  lat={lat}
                  lng={lng}
                  onMapClick={handleMapClick}
                  className="h-full w-full"
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <BusinessWizardFooter
        onBack={handleBack}
        onContinue={handleContinue}
        continueLabel="Next"
      />

      <div className="h-24" />
    </div>
  );
}
