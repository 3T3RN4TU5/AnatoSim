import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ConfidenceLevel } from '../data/anatomyCatalog';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  showTooltip?: boolean;
  compact?: boolean;
}

/**
 * Displays the data confidence level from physiology.json in accordance with Hard Rule #3.
 * Renders unboxed typographic metadata for high/approximate values and a prominent clinical
 * warning indicator with icon + text whenever a value or simulation is "illustrative".
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  compact = false,
}) => {
  if (confidence === 'illustrative') {
    return (
      <span
        data-testid="badge-illustrative"
        title="Illustrative educational approximation — not a clinical diagnostic reference value."
        className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0"
      >
        <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" aria-hidden="true" />
        <span>{compact ? 'Illust.' : 'Illustrative'}</span>
      </span>
    );
  }

  if (confidence === 'approximate') {
    return (
      <span
        title="Approximate physiological population range."
        className="inline-flex items-center gap-1 text-[10px] font-medium text-sky-700 whitespace-nowrap shrink-0"
      >
        <Info className="w-3 h-3 text-sky-600 shrink-0" aria-hidden="true" />
        <span>{compact ? 'Approx.' : 'Approximate range'}</span>
      </span>
    );
  }

  return (
    <span
      title="High-confidence textbook or clinical reference value."
      className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 whitespace-nowrap shrink-0"
    >
      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" aria-hidden="true" />
      <span>{compact ? 'Cited' : 'Cited reference'}</span>
    </span>
  );
};
