import React, { useMemo } from 'react';
import { Activity, Flame, Heart, Play, Zap } from 'lucide-react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import {
  computePhysiologyMetrics,
  MealType,
  PoseId,
  sampleActionPotentialMv,
  sampleEcgWaveform,
} from '../sim/physiologyMath';
import { ConfidenceBadge } from './ConfidenceBadge';

export const LiveTelemetryAndZoom: React.FC = () => {
  const activeSystem = useSimulatorStore((s) => s.activeSystem);
  const params = useSimulatorStore((s) => s.params);
  const simTime = useSimulatorStore((s) => s.simulationTimeSeconds);
  const updateParams = useSimulatorStore((s) => s.updateParams);
  const triggerKneeJerkReflex = useSimulatorStore((s) => s.triggerKneeJerkReflex);
  const colorBlindSafe = useSimulatorStore((s) => s.colorBlindSafe);

  const metrics = useMemo(() => computePhysiologyMetrics(params), [params]);

  // Generate SVG polyline points for live Lead-II ECG trace
  const ecgPoints = useMemo(() => {
    const pts: string[] = [];
    const beatsPerSec = metrics.heartRateBpm / 60;
    const phaseShift = (simTime * beatsPerSec) % 1;
    for (let i = 0; i <= 90; i++) {
      const x = (i / 90) * 320;
      const cyclePhase = (i / 45 + phaseShift) % 1;
      const mv = sampleEcgWaveform(cyclePhase);
      const y = 52 - mv * 34;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [metrics.heartRateBpm, simTime]);

  // Generate SVG polyline points for Respiratory Tidal Volume spirogram
  const respPoints = useMemo(() => {
    const pts: string[] = [];
    const breathsPerSec = metrics.respiratoryRateBpm / 60;
    const phaseShift = (simTime * breathsPerSec) % 1;
    const amp = Math.min(34, (metrics.tidalVolumeMl / 1200) * 34);
    for (let i = 0; i <= 80; i++) {
      const x = (i / 80) * 320;
      const phase = ((i / 40 + phaseShift) % 1) * Math.PI * 2;
      const y = 44 - Math.sin(phase) * amp;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [metrics.respiratoryRateBpm, metrics.tidalVolumeMl, simTime]);

  // Generate SVG polyline points for Neuronal Action Potential
  const actionPotentialPoints = useMemo(() => {
    const pts: string[] = [];
    const phaseShift = (simTime * 0.8) % 1;
    for (let i = 0; i <= 80; i++) {
      const x = (i / 80) * 320;
      const p = (i / 80 + phaseShift) % 1;
      const mv = sampleActionPotentialMv(p);
      // Map [-80, +40] mV to [72, 12] px
      const y = 72 - ((mv + 80) / 120) * 60;
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    return pts.join(' ');
  }, [simTime]);

  const artColor = colorBlindSafe ? '#f97316' : '#ef4444';
  const venColor = colorBlindSafe ? '#38bdf8' : '#3b82f6';

  if (activeSystem === 'circulatory') {
    return (
      <div className="space-y-4">
        {/* Live ECG & 4-Chamber Status */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-400 shrink-0" />
              <h4 className="text-xs font-semibold text-slate-200">
                Lead-II ECG & 4-Chamber Cardiac Cycle (Simplified Model)
              </h4>
            </div>
            <span className="font-mono text-xs text-emerald-400">
              {metrics.heartRateBpm} bpm · CO {metrics.cardiacOutputLMin} L/min
            </span>
          </div>

          <svg
            viewBox="0 0 320 80"
            className="w-full h-20 bg-slate-950 rounded border border-slate-800/80 mb-2.5"
            role="img"
            aria-label={`Live ECG waveform at ${metrics.heartRateBpm} beats per minute`}
          >
            <line x1="0" y1="52" x2="320" y2="52" stroke="#cbd5e1" strokeDasharray="3 3" />
            <polyline
              fill="none"
              stroke="#059669"
              strokeWidth="2"
              points={ecgPoints}
            />
            <text x="8" y="16" fill="#475569" fontSize="9" fontFamily="monospace">
              P (Atrial Systole) → QRS (Ventricular Systole) → T (Diastole)
            </text>
          </svg>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="bg-slate-950/80 p-2 rounded border border-slate-800/70">
              <div className="text-[11px] text-slate-400 font-sans">Blood Pressure</div>
              <div className="text-slate-100 font-semibold">
                {metrics.systolicBpMmHg}/{metrics.diastolicBpMmHg} mmHg
              </div>
            </div>
            <div className="bg-slate-950/80 p-2 rounded border border-slate-800/70">
              <div className="text-[11px] text-slate-400 font-sans">Stroke Volume</div>
              <div className="text-slate-100 font-semibold">{metrics.strokeVolumeMl} mL/beat</div>
            </div>
            <div className="bg-slate-950/80 p-2 rounded border border-slate-800/70">
              <div className="text-[11px] text-slate-400 font-sans">Blood Volume</div>
              <div className="text-slate-100 font-semibold">{metrics.bloodVolumeL} L</div>
            </div>
          </div>
        </div>

        {/* Sliders: Heart Rate, Activity, and Plaque Narrowing "What-If" */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="slider-activity" className="text-slate-300 font-medium">
                Physical Exercise & Sympathetic Demand
              </label>
              <span className="font-mono text-sky-400">{params.activityLevel}%</span>
            </div>
            <input
              id="slider-activity"
              type="range"
              min={0}
              max={100}
              value={params.activityLevel}
              onChange={(e) => updateParams({ activityLevel: Number(e.target.value), heartRateOverride: null })}
              className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="slider-hr-override" className="text-slate-300 font-medium">
                Manual Heart Rate Override
              </label>
              <span className="font-mono text-rose-400">{metrics.heartRateBpm} bpm</span>
            </div>
            <input
              id="slider-hr-override"
              type="range"
              min={45}
              max={195}
              value={metrics.heartRateBpm}
              onChange={(e) => updateParams({ heartRateOverride: Number(e.target.value) })}
              className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          {/* Optional "What-if": Narrowed Vessel (Plaque) */}
          <div className="pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between gap-2 text-xs mb-1">
              <label htmlFor="slider-stenosis" className="text-slate-200 font-medium flex items-center gap-1.5 whitespace-nowrap">
                <span>Plaque Narrowing (“What-If”)</span>
                <ConfidenceBadge confidence="illustrative" />
              </label>
              <span className="font-mono text-amber-400 whitespace-nowrap shrink-0">
                {params.vesselStenosisPercent}% → {(metrics.relativeVesselFlow * 100).toFixed(0)}% flow
              </span>
            </div>
            <input
              id="slider-stenosis"
              type="range"
              min={0}
              max={60}
              step={5}
              value={params.vesselStenosisPercent}
              onChange={(e) => updateParams({ vesselStenosisPercent: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Poiseuille r⁴ approximation: narrowing vessel radius by {params.vesselStenosisPercent}% reduces laminar conductance to {(metrics.relativeVesselFlow * 100).toFixed(1)}% (illustrative).
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (activeSystem === 'respiratory') {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs font-semibold text-slate-200">
              Alveolar Gas Exchange & Tidal Spirogram (Simplified Model)
            </h4>
            <span className="font-mono text-xs text-sky-400">
              {metrics.respiratoryRateBpm} br/min · TV {metrics.tidalVolumeMl} mL
            </span>
          </div>

          <svg
            viewBox="0 0 320 85"
            className="w-full h-20 bg-slate-950 rounded border border-slate-800/80 mb-2.5"
            role="img"
            aria-label="Live respiratory tidal volume spirogram"
          >
            <line x1="0" y1="44" x2="320" y2="44" stroke="#cbd5e1" strokeDasharray="3 3" />
            <polyline fill="none" stroke="#0284c7" strokeWidth="2" points={respPoints} />
            <text x="8" y="15" fill="#475569" fontSize="9" fontFamily="monospace">
              Minute Ventilation (VE): {metrics.minuteVentilationLMin} L/min | Alveolar PO₂: {metrics.alveolarPo2MmHg} mmHg
            </text>
          </svg>

          {/* Alveoli Micro-Zoom Schematic */}
          <div className="bg-slate-950/90 border border-slate-800/80 rounded p-2.5 flex items-center justify-between gap-3">
            <div className="text-xs space-y-1">
              <div className="font-semibold text-slate-200">Alveolar–Capillary Membrane Zoom</div>
              <div className="text-[11px] text-slate-400">
                O₂ diffuses from alveolar sac (PO₂ {metrics.alveolarPo2MmHg} mmHg) into pulmonary capillaries; CO₂ (PCO₂ {metrics.alveolarPco2MmHg} mmHg) diffuses out for exhalation.
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-2 font-mono text-xs">
              <span style={{ color: artColor }}>O₂ ↑</span>
              <span className="text-slate-600">·</span>
              <span style={{ color: venColor }}>CO₂ ↓</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5">
          <div className="flex justify-between text-xs mb-1">
            <label htmlFor="resp-activity-slider" className="text-slate-300 font-medium">
              Metabolic Activity Demand (Drives Diaphragm & Respiratory Rate)
            </label>
            <span className="font-mono text-sky-400">{params.activityLevel}%</span>
          </div>
          <input
            id="resp-activity-slider"
            type="range"
            min={0}
            max={100}
            value={params.activityLevel}
            onChange={(e) => updateParams({ activityLevel: Number(e.target.value) })}
            className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>
      </div>
    );
  }

  if (activeSystem === 'digestive') {
    const mealOptions: { id: MealType; label: string }[] = [
      { id: 'balanced', label: 'Balanced Meal' },
      { id: 'high_carb', label: 'High Carbohydrate' },
      { id: 'high_protein', label: 'High Protein' },
      { id: 'high_fat', label: 'High Lipid (Fat)' },
    ];

    return (
      <div className="space-y-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200">
              GI Peristalsis & Villous Absorption Timeline (Simplified Model)
            </h4>
            <span className="font-mono text-xs text-amber-400">
              {(params.digestiveElapsedMinutes / 60).toFixed(1)} hrs post-meal
            </span>
          </div>

          {/* Meal Selector */}
          <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="Meal composition selector">
            {mealOptions.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => updateParams({ mealType: m.id })}
                className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap truncate ${
                  params.mealType === m.id
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Scrub Timeline Slider */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <label htmlFor="digestive-timeline-slider" className="text-slate-300 font-medium">
                Digestive Transit Scrub ({metrics.digestiveStageLabel})
              </label>
              <span className="font-mono text-amber-300">{Math.round(metrics.bolusProgress01 * 100)}%</span>
            </div>
            <input
              id="digestive-timeline-slider"
              type="range"
              min={0}
              max={2100}
              step={15}
              value={params.digestiveElapsedMinutes}
              onChange={(e) => updateParams({ digestiveElapsedMinutes: Number(e.target.value) })}
              className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 font-mono mt-1">
              <span>Gastric: {metrics.gastricEmptyingHours}h</span>
              <span>Small Int: {metrics.smallIntestineHours}h</span>
              <span>Colon: {metrics.colonicHours}h</span>
            </div>
          </div>

          {/* Small Intestine Villi Absorption Bars & Enzymes */}
          <div className="bg-slate-950/90 border border-slate-800/80 rounded p-2.5 space-y-2">
            <div className="text-xs font-semibold text-slate-200">
              Small Intestine Enterocyte Villi & Lacteal Uptake
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Glucose (Capillary)</div>
                <div className="text-sky-400 font-semibold">{metrics.carbAbsorptionRate}% rate</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Amino Acids (Portal)</div>
                <div className="text-rose-400 font-semibold">{metrics.proteinAbsorptionRate}% rate</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-sans">Chylomicrons (Lymph)</div>
                <div className="text-amber-400 font-semibold">{metrics.lipidAbsorptionRate}% rate</div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
              <span className="text-slate-300 font-medium">Active Enzymes & Secretions: </span>
              {metrics.activeEnzymes.join(' · ')}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeSystem === 'nervous') {
    return (
      <div className="space-y-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 shrink-0" />
              <h4 className="text-xs font-semibold text-slate-200">
                Neuron Action Potential & Synapse Zoom (Simplified Model)
              </h4>
            </div>
            <span className="font-mono text-xs text-amber-400">{metrics.neuralFiringHz} Hz</span>
          </div>

          <svg
            viewBox="0 0 320 85"
            className="w-full h-20 bg-slate-950 rounded border border-slate-800/80"
            role="img"
            aria-label="Neuronal membrane potential waveform from -70 mV resting to +30 mV peak depolarization"
          >
            <line x1="0" y1="62" x2="320" y2="62" stroke="#cbd5e1" strokeDasharray="2 2" />
            <polyline fill="none" stroke="#d97706" strokeWidth="2" points={actionPotentialPoints} />
            <text x="8" y="14" fill="#b45309" fontSize="9" fontFamily="monospace">
              Peak: +30 mV (Na⁺ influx) | Threshold: -55 mV | Resting: -70 mV
            </text>
          </svg>

          {/* Reflex Arc Trigger Button */}
          <div className="flex items-center justify-between gap-3 bg-slate-950/90 border border-slate-800 rounded p-2.5">
            <div className="text-xs">
              <div className="font-semibold text-slate-200">Monosynaptic Knee-Jerk Reflex (L2–L4)</div>
              <div className="text-[11px] text-slate-400">
                Patellar tendon tap → Ia sensory afferent → spinal cord synapse → quadriceps kick (~21 ms latency).
              </div>
            </div>
            <button
              type="button"
              onClick={triggerKneeJerkReflex}
              className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-md transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Tap Patellar Tendon</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (activeSystem === 'musculoskeletal') {
    const poses: { id: PoseId; label: string }[] = [
      { id: 'anatomical_rest', label: 'Anatomical Rest' },
      { id: 'walk_gait', label: 'Walk Gait' },
      { id: 'run_sprint', label: 'Run / Sprint' },
      { id: 'squat_load', label: 'Loaded Squat' },
      { id: 'bicep_lift', label: 'Bicep Lift' },
    ];

    return (
      <div className="space-y-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-slate-200">
              Pose Kinematics & Sarcomere Sliding Filament (Simplified Model)
            </h4>
            <ConfidenceBadge confidence="illustrative" />
          </div>

          {/* Pose Buttons */}
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Biomechanical pose library">
            {poses.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  updateParams({
                    activePose: p.id,
                    activityLevel: p.id === 'run_sprint' ? 85 : p.id === 'squat_load' ? 65 : p.id === 'walk_gait' ? 35 : 12,
                  })
                }
                className={`px-2.5 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                  params.activePose === p.id
                    ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Sarcomere Sliding Filament Zoom */}
          <div className="bg-slate-950 border border-slate-800 rounded p-2.5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Sarcomere Z-Disc Length</span>
              <span className="font-mono text-rose-400">{metrics.sarcomereLengthUm} µm</span>
            </div>
            <div className="h-4 bg-slate-900 rounded overflow-hidden flex items-center justify-between px-2 border border-slate-800">
              <div
                className="h-1.5 bg-sky-400 rounded transition-all duration-300"
                style={{ width: `${Math.round((2.4 - metrics.sarcomereLengthUm) * 75)}%` }}
              />
              <div className="h-2 w-1/3 bg-rose-500 rounded-sm" title="Myosin Thick Filament (A-Band)" />
              <div
                className="h-1.5 bg-sky-400 rounded transition-all duration-300"
                style={{ width: `${Math.round((2.4 - metrics.sarcomereLengthUm) * 75)}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between font-mono">
              <span>Actin (Thin) + Myosin (Thick) Overlap</span>
              <span>Bones: {metrics.boneCount} | Density: {(metrics.trabecularBoneDensityIndex * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Muscle Activation Readout */}
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-slate-950/70 p-2 rounded border border-slate-800/70 flex justify-between">
              <span className="text-slate-400 font-sans">Quadriceps</span>
              <span className="text-rose-300">{metrics.muscleActivations.quadriceps}%</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded border border-slate-800/70 flex justify-between">
              <span className="text-slate-400 font-sans">Biceps Brachii</span>
              <span className="text-rose-300">{metrics.muscleActivations.biceps}%</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded border border-slate-800/70 flex justify-between">
              <span className="text-slate-400 font-sans">Core / Rectus</span>
              <span className="text-rose-300">{metrics.muscleActivations.coreAbdominals}%</span>
            </div>
            <div className="bg-slate-950/70 p-2 rounded border border-slate-800/70 flex justify-between">
              <span className="text-slate-400 font-sans">Calves / Hamstrings</span>
              <span className="text-rose-300">{metrics.muscleActivations.hamstringsCalves}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Default: Renal, Endocrine, Immune & Integumentary
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <h4 className="text-xs font-semibold text-slate-200">
              Nephron Filtration, Glucose Loop & Thermoregulation (Simplified Model)
            </h4>
          </div>
          <span className="font-mono text-xs text-emerald-400">GFR {metrics.gfrMlMin} mL/min</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-sans">Urine Output & Bladder</div>
            <div className="text-amber-300 font-semibold">
              {metrics.urineOutputLDay} L/d ({metrics.bladderFillPercent}% full)
            </div>
          </div>
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-sans">Blood Glucose</div>
            <div className="text-sky-300 font-semibold">{metrics.bloodGlucoseMgDl} mg/dL</div>
          </div>
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-sans">Insulin / Glucagon</div>
            <div className="text-emerald-300 font-semibold">
              Ins {metrics.insulinRelativeLevel}% · Glu {metrics.glucagonRelativeLevel}%
            </div>
          </div>
          <div className="bg-slate-950/80 p-2 rounded border border-slate-800/80">
            <div className="text-[11px] text-slate-400 font-sans">Core Temp & Sweat</div>
            <div className="text-rose-300 font-semibold">
              {metrics.coreTempC}°C · {metrics.sweatRateMlHr} mL/h
            </div>
          </div>
        </div>

        {/* Hydration Slider */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <label htmlFor="hydration-slider" className="text-slate-300 font-medium">
              Systemic Hydration Status (Modulates ADH, GFR & Urine Concentration)
            </label>
            <span className="font-mono text-sky-400">{params.hydrationLevel}%</span>
          </div>
          <input
            id="hydration-slider"
            type="range"
            min={10}
            max={100}
            value={params.hydrationLevel}
            onChange={(e) => updateParams({ hydrationLevel: Number(e.target.value) })}
            className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => useSimulatorStore.getState().setActiveModal('hygiene')}
          className="w-full py-1.5 px-3 bg-slate-950 hover:bg-slate-800 text-teal-300 border border-teal-500/40 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap"
        >
          Open Excretion & CDC/WHO Hygiene Scenarios
        </button>
      </div>
    </div>
  );
};
