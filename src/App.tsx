/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback } from 'react';
import { Eye, ShieldAlert } from 'lucide-react';
import { BodyViewport3D } from './components/BodyViewport3D';
import { BottomControlDock } from './components/BottomControlDock';
import { RightInspectorPanel } from './components/RightInspectorPanel';
import { ModalsAndDrawers } from './components/ModalsAndDrawers';
import { useSimulatorStore } from './store/useSimulatorStore';

export default function App() {
  const setActiveModal = useSimulatorStore((s) => s.setActiveModal);
  const colorBlindSafe = useSimulatorStore((s) => s.colorBlindSafe);
  const setColorBlindSafe = useSimulatorStore((s) => s.setColorBlindSafe);
  const reducedMotion = useSimulatorStore((s) => s.reducedMotion);
  const setReducedMotion = useSimulatorStore((s) => s.setReducedMotion);

  const handleExportSnapshot = useCallback(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `somalab-anatomy-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      // ignore export errors in restricted contexts
    }
  }, []);

  return (
    <div className="dark w-screen h-screen bg-[#0b1120] text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3 bg-slate-950 border-b border-slate-800/90 shrink-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveModal('none');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0 font-display"
        >
          SomaLab
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Simulation Views"
          className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300"
        >
          <button
            type="button"
            onClick={() => setActiveModal('omnisoma')}
            className="text-sky-300 hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            OmniSoma Agents
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('day_timeline')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Day Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('compare')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Compare Mode
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('lessons')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Guided Quizzes
          </button>
          <button
            type="button"
            onClick={() => setActiveModal('sources')}
            className="hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sources & Citations
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleExportSnapshot}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-sky-400 hover:bg-sky-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Export Snapshot
          </button>
        </div>
      </header>

      {/* Main Two-Zone Interactive Sandbox */}
      <main className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left/Center 3D Stage */}
        <div className="flex-1 min-h-[380px] h-[52vh] lg:h-full relative overflow-hidden">
          {/* Mandatory Visible Clinical Disclaimer Banner (Hard Rule #1) & Accessibility Bar */}
          <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div
              data-testid="medical-disclaimer-banner"
              className="pointer-events-auto bg-slate-950/90 border border-amber-500/40 rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs text-amber-200 shadow-lg"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
              <span className="font-medium">
                Educational simplification. Not for diagnosis or medical decisions.
              </span>
            </div>

            <div className="pointer-events-auto flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-lg p-1 text-xs">
              <button
                type="button"
                onClick={() => setColorBlindSafe(!colorBlindSafe)}
                aria-pressed={colorBlindSafe}
                className={`px-2.5 py-1 rounded font-medium flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  colorBlindSafe
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Color-Blind Palette</span>
              </button>
              <button
                type="button"
                onClick={() => setReducedMotion(!reducedMotion)}
                aria-pressed={reducedMotion}
                className={`px-2.5 py-1 rounded font-medium cursor-pointer whitespace-nowrap ${
                  reducedMotion
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Reduced Motion
              </button>
            </div>
          </div>

          {/* 3D WebGL Anatomical Canvas */}
          <BodyViewport3D />

          {/* Unified Bottom Dissection & Time Dock */}
          <BottomControlDock />
        </div>

        {/* Right Inspector & Physiological Simulation Deck */}
        <RightInspectorPanel />
      </main>

      {/* Modals for Sources, Compare Mode, Day Timeline, Quizzes & Hygiene */}
      <ModalsAndDrawers />
    </div>
  );
}
