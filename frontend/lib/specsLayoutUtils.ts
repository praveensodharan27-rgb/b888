import type { SpecIconKey } from '@/lib/adCardSpecs';
import { toShortFormat } from '@/lib/specTextUtils';

export interface SpecItem {
  icon: SpecIconKey;
  label: string;
}

/** Character overhead per spec (icon box + gap in char equivalents) */
const SPEC_OVERHEAD_CHARS = 5;
/** Separator between specs on same line */
const SEPARATOR_CHARS = 2;

/**
 * Single-line spec layout. Fits as many specs as possible on one line.
 * - Applies short format (25,000 km → 25k km) to long labels.
 * - Same layout for all cards in same category (identical charsPerLine).
 * - Specs that don't fit → hidden (not rendered).
 */
export function getSpecsLayout(
  specs: SpecItem[],
  charsPerLine: number | null
): SpecItem[][] {
  if (!specs.length) return [];
  const effectiveChars = charsPerLine != null && charsPerLine > 0 ? charsPerLine : 60;

  const shortSpecs = specs.map((s) => ({ ...s, label: toShortFormat(s.label) }));

  const line: SpecItem[] = [];
  let currentChars = 0;

  for (const spec of shortSpecs) {
    const specChars = SPEC_OVERHEAD_CHARS + spec.label.length;
    const separator = line.length > 0 ? SEPARATOR_CHARS : 0;
    const total = specChars + separator;

    if (currentChars + total <= effectiveChars) {
      line.push(spec);
      currentChars += total;
    }
    /* else: hide spec - no space on single line */
  }

  return line.length > 0 ? [line] : [];
}
