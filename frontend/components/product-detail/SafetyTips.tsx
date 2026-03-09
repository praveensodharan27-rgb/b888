'use client';

import { FiShield } from 'react-icons/fi';

const TIPS = [
  'Meet in a safe public place',
  'Check the item before you buy',
  'Pay only after collecting the item',
  'Never pay in advance',
];

export function SafetyTips() {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
      <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <FiShield className="w-5 h-5 text-primary-600 shrink-0" />
        Safety Tips
      </h2>
      <ul className="space-y-2 text-sm text-gray-700 leading-relaxed">
        {TIPS.map((tip, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}
