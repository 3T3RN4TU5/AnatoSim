import React from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { ConfidenceLevel } from '../data/anatomyCatalog';

interface ConfidenceBadgeProps {
  confidence: ConfidenceLevel;
  showTooltip?: boolean;
}

/**
 * Displays the data confidence level from physiology.json in accordance with Hard Rule #3.
 * Renders unboxed typographic metadata for high/approximate values and a prominent clinical
 * warning indicator with icon + text whenever a value or simulation is "illustrative".
 */
export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({ confidence }) => {
  if (confidence === 'illustrative') {
    return (
      <span
        data-testid="badge-illustrative"
        title="Illustrative educational approximation — not a clinical diagnostic reference value."
        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-300 bg-amber-950/70 border border-amber-500/40 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0"
      >
        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" aria-hidden="true" />
        <span>Illustrative</span>
      </span>
    );
  }

  if (confidence === 'approximate') {
    return (
      <span
        title="Approximate physiological population range."
        className="inline-flex items-center gap-1 text-[11px] text-sky-300 whitespace-nowrap shrink-0"
      >
        <Info className="w-3 h-3 text-sky-400 shrink-0" aria-hidden="true" />
        <span>Approximate range</span>
      </span>
    );
  }

  return (
    <span
      title="High-confidence textbook or clinical reference value."
      className="inline-flex items-center gap-1 text-[11px] text-emerald-300 whitespace-nowrap shrink-0"
    >
      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
      <span>Cited reference</span>
    </span>
  );
};
