'use client';

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import {
  BusinessWizardState,
  INITIAL_WIZARD_STATE,
  BusinessCategoryId,
  CompanySize,
} from '@/lib/businessDirectory/types';

const STORAGE_KEY = 'business_directory_wizard';

type SetDetails = Partial<BusinessWizardState['details']>;
type SetLocation = Partial<BusinessWizardState['location']>;

interface BusinessWizardContextValue {
  state: BusinessWizardState;
  setStep: (step: number) => void;
  setCategory: (category: BusinessCategoryId | string | null, categoryName?: string) => void;
  setDetails: (d: SetDetails) => void;
  setLocation: (l: SetLocation) => void;
  setOperatingHours: (hours: BusinessWizardState['operatingHours']) => void;
  setAgreedToTerms: (v: boolean) => void;
  persist: () => void;
  load: () => void;
  reset: () => void;
}

const BusinessWizardContext = createContext<BusinessWizardContextValue | null>(null);

function loadFromStorage(): BusinessWizardState {
  if (typeof window === 'undefined') return INITIAL_WIZARD_STATE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_WIZARD_STATE;
    const parsed = JSON.parse(raw) as Partial<BusinessWizardState>;
    return {
      ...INITIAL_WIZARD_STATE,
      ...parsed,
      details: { ...INITIAL_WIZARD_STATE.details, ...parsed.details },
      location: { ...INITIAL_WIZARD_STATE.location, ...parsed.location },
    };
  } catch {
    return INITIAL_WIZARD_STATE;
  }
}

export function BusinessWizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<BusinessWizardState>(INITIAL_WIZARD_STATE);

  const persist = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);

  const load = useCallback(() => {
    setState(loadFromStorage());
  }, []);

  const setStep = useCallback((step: number) => {
    setState((s) => ({ ...s, step }));
  }, []);

  const setCategory = useCallback((category: BusinessCategoryId | string | null, categoryName?: string) => {
    setState((s) => ({ ...s, category, ...(categoryName !== undefined && { categoryName }) }));
  }, []);

  const setDetails = useCallback((d: SetDetails) => {
    setState((s) => ({ ...s, details: { ...s.details, ...d } }));
  }, []);

  const setLocation = useCallback((l: SetLocation) => {
    setState((s) => ({ ...s, location: { ...s.location, ...l } }));
  }, []);

  const setOperatingHours = useCallback((operatingHours: BusinessWizardState['operatingHours']) => {
    setState((s) => ({ ...s, operatingHours }));
  }, []);

  const setAgreedToTerms = useCallback((agreedToTerms: boolean) => {
    setState((s) => ({ ...s, agreedToTerms }));
  }, []);

  const value = useMemo(
    () => ({
      state,
      setStep,
      setCategory,
      setDetails,
      setLocation,
      setOperatingHours,
      setAgreedToTerms,
      persist,
      load,
      reset: () => setState(INITIAL_WIZARD_STATE),
    }),
    [
      state,
      setStep,
      setCategory,
      setDetails,
      setLocation,
      setOperatingHours,
      setAgreedToTerms,
      persist,
      load,
    ]
  );

  return (
    <BusinessWizardContext.Provider value={value}>
      {children}
    </BusinessWizardContext.Provider>
  );
}

export function useBusinessWizard() {
  const ctx = useContext(BusinessWizardContext);
  if (!ctx) throw new Error('useBusinessWizard must be used within BusinessWizardProvider');
  return ctx;
}
