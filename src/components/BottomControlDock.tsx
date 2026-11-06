import React from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Pause,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
} from 'lucide-react';
import { ANATOMY_LAYERS, LayerId } from '../data/anatomyCatalog';
import { QualityTier, SliceAxis, useSimulatorStore } from '../store/useSimulatorStore';

const SPEED_OPTIONS = [0.1, 1, 10, 100, 1000];

export const BottomControlDock: React.FC = () => {
  const layers = useSimulatorStore((s) => s.layers);
  const toggleLayer = useSimulatorStore((s) => s.toggleLayer);
  const setLayerOpacity = useSimulatorStore((s) => s.setLayerOpacity);
  const resetLayers = useSimulatorStore((s) => s.resetLayers);
  const xrayMode = useSimulatorStore((s) => s.xrayMode);
  const setXrayMode = useSimulatorStore((s) => s.setXrayMode);
  const isolateSelectedPart = useSimulatorStore((s) => s.isolateSelectedPart);
  const setIsolateSelectedPart = useSimulatorStore((s) => s.setIsolateSelectedPart);
  const explodedFactor = useSimulatorStore((s) => s.explodedFactor);
  const setExplodedFactor = useSimulatorStore((s) => s.setExplodedFactor);
  const sliceAxis = useSimulatorStore((s) => s.sliceAxis);
  const setSliceAxis = useSimulatorStore((s) => s.setSliceAxis);
  const slicePosition = useSimulatorStore((s) => s.slicePosition);
  const setSlicePosition = useSimulatorStore((s) => s.setSlicePosition);
  const isPlaying = useSimulatorStore((s) => s.isPlaying);
  const setIsPlaying = useSimulatorStore((s) => s.setIsPlaying);
  const timeSpeedMultiplier = useSimulatorStore((s) => s.timeSpeedMultiplier);
  const setTimeSpeedMultiplier = useSimulatorStore((s) => s.setTimeSpeedMultiplier);
  const quality = useSimulatorStore((s) => s.quality);
  const setQuality = useSimulatorStore((s) => s.setQuality);
  const dockCollapsed = useSimulatorStore((s) => s.dockCollapsed);
  const setDockCollapsed = useSimulatorStore((s) => s.setDockCollapsed);

  const applyDissectionPreset = useSimulatorStore((s) => s.applyDissectionPreset);

  return (
    <div
      className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 w-[min(960px,96%)] pointer-events-auto"
      aria-label="Anatomical Dissection and Time Controls Dock"
    >
      {/* Collapse / Expand Toggle Tab */}
      <div className="flex justify-center mb-1">
        <button
          type="button"
          onClick={() => setDockCollapsed(!dockCollapsed)}
          className="px-3 py-1 bg-slate-900/95 hover:bg-slate-800 text-slate-300 text-xs font-medium rounded-t-lg border border-b-0 border-slate-700/80 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Show Anatomy Layers & Time Dock</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              <span>Hide Controls (Cinema Mode)</span>
            </>
          )}
        </button>
      </div>

      {!dockCollapsed && (
        <div className="bg-slate-950/95 border border-slate-800 rounded-xl p-3 shadow-2xl space-y-2.5">
          {/* Row 1: 8 Anatomical Layers with Visibility Toggles, Opacity Sliders & Atlas View Presets */}
          <div className="flex items-center justify-between gap-1.5 pb-2 border-b border-slate-800/90 overflow-x-auto">
            <div className="flex items-center gap-1 shrink-0 text-xs font-semibold text-slate-300">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span>Layers:</span>
            </div>

            <div className="flex items-center gap-1">
              {ANATOMY_LAYERS.map((layer) => {
                const st = layers[layer.id];
                return (
                  <div
                    key={layer.id}
                    className={`flex flex-col items-center px-1.5 py-1 rounded-lg border transition-colors ${
                      st.visible
                        ? 'bg-slate-900 border-slate-700 text-slate-100'
                        : 'bg-slate-950 border-slate-900 text-slate-500'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleLayer(layer.id)}
                      aria-pressed={st.visible}
                      className="flex items-center gap-1 text-[11px] font-medium whitespace-nowrap cursor-pointer"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm shrink-0 border border-slate-400/80"
                        style={{
                          backgroundColor: st.visible ? layer.colorSwatch : '#cbd5e1',
                        }}
                      />
                      <span>{layer.shortLabel}</span>
                    </button>
                    <input
                      type="range"
                      aria-label={`${layer.shortLabel} layer opacity`}
                      min={0.05}
                      max={1}
                      step={0.05}
                      value={st.opacity}
                      onChange={(e) => setLayerOpacity(layer.id as LayerId, Number(e.target.value))}
                      className="w-10 h-1 mt-1 accent-sky-400 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                data-testid="preset-ecorche"
                onClick={() => applyDissectionPreset('ecorche')}
                title="Solid Muscular Écorché & Skeleton View"
                className="px-2 py-1 text-[11px] font-medium text-rose-200 hover:text-white bg-rose-950/60 hover:bg-rose-900/70 border border-rose-800/70 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Écorché
              </button>
              <button
                type="button"
                data-testid="preset-visceral"
                onClick={() => applyDissectionPreset('visceral')}
                title="Internal Organs & Vascular View"
                className="px-2 py-1 text-[11px] font-medium text-sky-200 hover:text-white bg-sky-950/60 hover:bg-sky-900/70 border border-sky-800/70 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Visceral
              </button>
              <button
                type="button"
                data-testid="preset-surface"
                onClick={() => applyDissectionPreset('surface')}
                title="Solid Human Surface View"
                className="px-2 py-1 text-[11px] font-medium text-amber-200 hover:text-white bg-amber-950/60 hover:bg-amber-900/70 border border-amber-800/70 rounded-lg cursor-pointer whitespace-nowrap"
              >
                Surface
              </button>
              <button
                type="button"
                data-testid="preset-reset"
                onClick={resetLayers}
                title="Reset all layers and dissection planes"
                className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Row 2: Dissection Modes (X-Ray, Isolate, Explode, Clipping Slice) & Time/Quality Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Dissection Toggles */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setXrayMode(!xrayMode)}
                aria-pressed={xrayMode}
                className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  xrayMode
                    ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>X-Ray Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setIsolateSelectedPart(!isolateSelectedPart)}
                aria-pressed={isolateSelectedPart}
                className={`px-2.5 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  isolateSelectedPart
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Isolate Organ</span>
              </button>

              {/* Exploded View Slider */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                <label htmlFor="explode-slider" className="text-slate-400 whitespace-nowrap">
                  Spread:
                </label>
                <input
                  id="explode-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={explodedFactor}
                  onChange={(e) => setExplodedFactor(Number(e.target.value))}
                  className="w-16 h-1 accent-sky-400 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Clipping Plane / Slice Tool */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg">
                <Scissors className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <label htmlFor="slice-axis-select" className="sr-only">
                  Anatomical Clipping Plane Axis
                </label>
                <select
                  id="slice-axis-select"
                  value={sliceAxis}
                  onChange={(e) => setSliceAxis(e.target.value as SliceAxis)}
                  className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="none" className="bg-slate-900">Slice: Off</option>
                  <option value="axial" className="bg-slate-900">Axial (Transverse)</option>
                  <option value="sagittal" className="bg-slate-900">Sagittal (Left/Right)</option>
                  <option value="coronal" className="bg-slate-900">Coronal (Front/Back)</option>
                </select>
                {sliceAxis !== 'none' && (
                  <input
                    type="range"
                    aria-label="Clipping plane depth position"
                    min={-1}
                    max={1}
                    step={0.05}
                    value={slicePosition}
                    onChange={(e) => setSlicePosition(Number(e.target.value))}
                    className="w-16 h-1 accent-rose-400 bg-slate-800 rounded cursor-pointer"
                  />
                )}
              </div>
            </div>

            {/* Time Controls (Play/Pause + 0.1x–1000x Speed) & Quality */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                aria-label={isPlaying ? 'Pause simulation' : 'Play simulation'}
                className="px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isPlaying ? 'Pause' : 'Play'}</span>
              </button>

              <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                {SPEED_OPTIONS.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setTimeSpeedMultiplier(spd)}
                    className={`px-2 py-1 rounded-md font-mono text-[11px] transition-colors cursor-pointer whitespace-nowrap ${
                      timeSpeedMultiplier === spd
                        ? 'bg-slate-800 text-sky-300 font-semibold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              <label htmlFor="quality-select" className="sr-only">
                Graphics Quality Tier
              </label>
              <select
                id="quality-select"
                value={quality}
                onChange={(e) => setQuality(e.target.value as QualityTier)}
                className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2 py-1.5 text-xs font-medium cursor-pointer"
              >
                <option value="low">Quality: Low</option>
                <option value="medium">Quality: Med</option>
                <option value="high">Quality: High</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
