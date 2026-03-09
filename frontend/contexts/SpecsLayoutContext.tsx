'use client';

import { createContext, useContext, useState, useCallback } from 'react';

interface SpecsLayoutContextValue {
  /** Character capacity per line (from first card measurement) */
  charsPerLine: number | null;
  /** Report container width; computes and stores charsPerLine for all cards */
  reportWidth: (width: number) => void;
}

const SpecsLayoutContext = createContext<SpecsLayoutContextValue | null>(null);

/** Average character width in px for text-sm (14px) - used for charsPerLine calculation */
const AVG_CHAR_WIDTH = 8;

export function SpecsLayoutProvider({ children }: { children: React.ReactNode }) {
  const [charsPerLine, setCharsPerLineState] = useState<number | null>(null);

  const reportWidth = useCallback((width: number) => {
    if (width <= 0) return;
    const next = Math.floor(width / AVG_CHAR_WIDTH);
    setCharsPerLineState((prev) => (prev !== next ? next : prev));
  }, []);

  const value: SpecsLayoutContextValue = {
    charsPerLine,
    reportWidth,
  };

  return (
    <SpecsLayoutContext.Provider value={value}>
      {children}
    </SpecsLayoutContext.Provider>
  );
}

export function useSpecsLayout() {
  const ctx = useContext(SpecsLayoutContext);
  return ctx ?? { charsPerLine: null, reportWidth: () => {} };
}
