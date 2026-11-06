import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Cpu,
  Droplets,
  ExternalLink,
  GitCompare,
  Play,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { PHYSIOLOGY_DATA, SYSTEMS_METADATA } from '../data/anatomyCatalog';
import { DAY_IN_THE_BODY_EVENTS, SYSTEM_QUIZZES } from '../data/lessonsData';
import { computePhysiologyMetrics, SimulationParameters } from '../sim/physiologyMath';
import {
  runOmniSomaOrchestrationTick,
  SpecialistAgentId,
  SPECIALIST_AGENTS_REGISTRY,
} from '../sim/omniSomaOrchestrator';
import { ConfidenceBadge } from './ConfidenceBadge';

export const ModalsAndDrawers: React.FC = () => {
  const activeModal = useSimulatorStore((s) => s.activeModal);
  const setActiveModal = useSimulatorStore((s) => s.setActiveModal);
  const params = useSimulatorStore((s) => s.params);
  const applyCircadianEvent = useSimulatorStore((s) => s.applyCircadianEvent);
  const comparePreset = useSimulatorStore((s) => s.comparePreset);
  const setComparePreset = useSimulatorStore((s) => s.setComparePreset);
  const completedQuizIds = useSimulatorStore((s) => s.completedQuizIds);
  const markQuizCompleted = useSimulatorStore((s) => s.markQuizCompleted);

  const orchestratorEnv = useSimulatorStore((s) => s.orchestratorEnv);
  const orchestratorTickCount = useSimulatorStore((s) => s.orchestratorTickCount);
  const updateOrchestratorEnv = useSimulatorStore((s) => s.updateOrchestratorEnv);
  const stepOrchestratorTick = useSimulatorStore((s) => s.stepOrchestratorTick);
  const focusedAgentId = useSimulatorStore((s) => s.focusedAgentId);
  const setFocusedAgentId = useSimulatorStore((s) => s.setFocusedAgentId);

  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const blackboard = useMemo(
    () => runOmniSomaOrchestrationTick(params, orchestratorEnv, orchestratorTickCount - 1, 1.0),
    [params, orchestratorEnv, orchestratorTickCount],
  );

  if (activeModal === 'none') return null;

  // Compare Mode Configurations
  const getComparePair = (): { titleA: string; titleB: string; stateA: SimulationParameters; stateB: SimulationParameters } => {
    if (comparePreset === 'young_vs_older') {
      return {
        titleA: 'Young Adult (25–35 yr)',
        titleB: 'Older Adult (65+ yr)',
        stateA: { ...params, ageGroup: 'adult', activityLevel: 20 },
        stateB: { ...params, ageGroup: 'older_adult', activityLevel: 20 },
      };
    }
    if (comparePreset === 'hydrated_vs_dehydrated') {
      return {
        titleA: 'Euhydrated (85% Hydration)',
        titleB: 'Hypohydrated (20% Hydration)',
        stateA: { ...params, hydrationLevel: 85 },
        stateB: { ...params, hydrationLevel: 20 },
      };
    }
    if (comparePreset === 'normal_vs_stenosis') {
      return {
        titleA: 'Patent Artery (0% Stenosis)',
        titleB: '35% Luminal Plaque Narrowing (Illustrative)',
        stateA: { ...params, vesselStenosisPercent: 0 },
        stateB: { ...params, vesselStenosisPercent: 35 },
      };
    }
    return {
      titleA: 'Resting Baseline (10% Activity)',
      titleB: 'Vigorous Aerobic Exercise (85% Activity)',
      stateA: { ...params, activityLevel: 10, stressLevel: 10, heartRateOverride: null },
      stateB: { ...params, activityLevel: 85, stressLevel: 40, heartRateOverride: null },
    };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-dialog-title"
      className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-5xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            {activeModal === 'omnisoma' && <Cpu className="w-5 h-5 text-sky-400" />}
            {activeModal === 'sources' && <BookOpen className="w-5 h-5 text-sky-400" />}
            {activeModal === 'compare' && <GitCompare className="w-5 h-5 text-sky-400" />}
            {activeModal === 'day_timeline' && <Clock className="w-5 h-5 text-amber-400" />}
            {activeModal === 'lessons' && <Award className="w-5 h-5 text-emerald-400" />}
            {activeModal === 'hygiene' && <ShieldCheck className="w-5 h-5 text-teal-400" />}

            <h2 id="modal-dialog-title" className="text-lg font-bold text-slate-100">
              {activeModal === 'omnisoma' &&
                'OmniSoma Physiological Orchestrator — 10 Autonomous Specialist Agents'}
              {activeModal === 'sources' && 'Scientific Sources, Asset Licenses & Model Limitations'}
              {activeModal === 'compare' && 'Physiological Compare Mode (Side-by-Side Analysis)'}
              {activeModal === 'day_timeline' && 'A Day in the Body — 24-Hour Circadian Physiology'}
              {activeModal === 'lessons' && 'Guided Anatomy & Physiology Quizzes'}
              {activeModal === 'hygiene' && 'Excretion Pathways & Evidence-Based Hygiene Scenarios'}
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setActiveModal('none')}
            aria-label="Close modal dialog"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* 0. OMNISOMA PHYSIOLOGICAL ORCHESTRATOR & BLACKBOARD BUS */}
          {activeModal === 'omnisoma' && (
            <div className="space-y-6">
              {/* Top Protocol Banner & Step 1 Environment Inputs */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="text-sky-400 font-semibold">
                      Blackboard Data Bus Protocol · Discrete Timestep dt = {blackboard.dtSeconds.toFixed(1)}s
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      Cycle: 1. Ingest Environment → 2. Gather 10 Agent States → 3. Detect Cross-System Discrepancies → 4. Dispatch Control Vectors → 5. Commit Frame
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right font-mono">
                      <div className="text-slate-400 text-[11px]">Cycle Tick #{blackboard.tickCount}</div>
                      <div className="text-emerald-400 font-bold text-sm">
                        Homeostasis: {blackboard.homeostasisScore}%
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={stepOrchestratorTick}
                      className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute 1.0s Tick</span>
                    </button>
                  </div>
                </div>

                {/* Step 1: Environment & Stressor Sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <label htmlFor="env-temp-slider" className="text-slate-300 font-medium">
                        Ambient Temp
                      </label>
                      <span className="font-mono text-sky-300">{orchestratorEnv.ambientTempC}°C</span>
                    </div>
                    <input
                      id="env-temp-slider"
                      type="range"
                      min={-5}
                      max={42}
                      value={orchestratorEnv.ambientTempC}
                      onChange={(e) => updateOrchestratorEnv({ ambientTempC: Number(e.target.value) })}
                      className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <label htmlFor="env-work-slider" className="text-slate-300 font-medium">
                        Physical Workload
                      </label>
                      <span className="font-mono text-emerald-300">{orchestratorEnv.physicalWorkload}%</span>
                    </div>
                    <input
                      id="env-work-slider"
                      type="range"
                      min={0}
                      max={100}
                      value={orchestratorEnv.physicalWorkload}
                      onChange={(e) => updateOrchestratorEnv({ physicalWorkload: Number(e.target.value) })}
                      className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <label htmlFor="env-trauma-slider" className="text-slate-300 font-medium">
                        Acute Trauma / Injury
                      </label>
                      <span className="font-mono text-rose-400">{orchestratorEnv.traumaLevel}%</span>
                    </div>
                    <input
                      id="env-trauma-slider"
                      type="range"
                      min={0}
                      max={100}
                      value={orchestratorEnv.traumaLevel}
                      onChange={(e) => updateOrchestratorEnv({ traumaLevel: Number(e.target.value) })}
                      className="w-full accent-rose-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3">
                    <div className="flex justify-between mb-1">
                      <label htmlFor="env-nourish-slider" className="text-slate-300 font-medium">
                        Nourishment Reserve
                      </label>
                      <span className="font-mono text-amber-300">{orchestratorEnv.nourishmentLevel}%</span>
                    </div>
                    <input
                      id="env-nourish-slider"
                      type="range"
                      min={10}
                      max={100}
                      value={orchestratorEnv.nourishmentLevel}
                      onChange={(e) => updateOrchestratorEnv({ nourishmentLevel: Number(e.target.value) })}
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Step 3 & 4: Cross-System Discrepancies & Corrective Control Vectors */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <h3 className="text-sm font-bold text-slate-100">
                    Step 3: Cross-System Discrepancies & Warnings ({blackboard.discrepancies.length})
                  </h3>
                  {blackboard.discrepancies.length === 0 ? (
                    <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg text-emerald-300">
                      All 10 physiological agents are operating within baseline homeostatic tolerances.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {blackboard.discrepancies.map((d) => (
                        <div
                          key={d.id}
                          className="p-3 bg-slate-900 border border-amber-500/30 rounded-lg space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-amber-300">{d.title}</span>
                            <span className="font-mono text-[11px] text-slate-400">
                              Sensor: {d.detectedBy}
                            </span>
                          </div>
                          <p className="text-slate-300">{d.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5">
                  <h3 className="text-sm font-bold text-slate-100">
                    Step 4: Dispatched Bio-Signal Control Vectors ({blackboard.controlVectors.length})
                  </h3>
                  <div className="space-y-2">
                    {blackboard.controlVectors.map((vec) => (
                      <div
                        key={vec.id}
                        className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sky-300">{vec.signalName}</span>
                          <span className="font-mono text-emerald-400 shrink-0">{vec.magnitude}</span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                          <span>{vec.sourceAgent}</span>
                          <ArrowRight className="w-3 h-3 text-sky-400" />
                          <span>{vec.targetAgent}</span>
                        </div>
                        <p className="text-slate-300">{vec.adjustmentSummary}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step 2 & 5: All 10 Specialist Agents Grid Assigned to Every Body Part */}
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-3">
                  10 Active Specialist Agents & Anatomical Body-Part Assignments
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SPECIALIST_AGENTS_REGISTRY.map((reg, index) => {
                    const ag = blackboard.agents[reg.id];
                    const isFocused = focusedAgentId === reg.id;
                    return (
                      <div
                        key={reg.id}
                        className={`bg-slate-950 border rounded-xl p-4 space-y-3 transition-colors ${
                          isFocused ? 'border-sky-400' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[11px] font-mono text-sky-400">
                              {String(index + 1).padStart(2, '0')}. {ag.codeName}
                            </div>
                            <div className="text-slate-400 text-[11px] mt-0.5">{ag.domainSummary}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFocusedAgentId(reg.id as SpecialistAgentId);
                              setActiveModal('none');
                            }}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-200 font-medium rounded text-[11px] transition-colors shrink-0 cursor-pointer whitespace-nowrap"
                          >
                            Inspect in 3D
                          </button>
                        </div>

                        <div className="text-[11px] text-slate-300">
                          <span className="text-slate-400">Assigned Body Parts: </span>
                          {ag.assignedPartNames.join(' · ')}
                        </div>

                        <div className="grid grid-cols-3 gap-2 font-mono">
                          {ag.variables.map((v) => (
                            <div
                              key={v.key}
                              className="bg-slate-900 border border-slate-800/90 rounded p-2"
                            >
                              <div className="text-[10px] text-slate-400 font-sans truncate">
                                {v.label}
                              </div>
                              <div className="text-slate-100 font-semibold truncate">
                                {v.value} <span className="text-[10px] text-slate-400">{v.unit}</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
                          <span className="text-slate-300 font-medium">Active Directive: </span>
                          {ag.lastDirectiveReceived}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {/* 1. SOURCES & CITATIONS PAGE */}
          {activeModal === 'sources' && (
            <div className="space-y-6">
              <div className="bg-amber-950/40 border border-amber-500/30 rounded-xl p-4 text-amber-200 leading-relaxed">
                <strong>Educational Disclaimer (Hard Rule #1):</strong> Educational simplification. Not for diagnosis or medical decisions. Every physiological parameter in SomaLab is sourced from peer-reviewed or clinical textbooks in <code>src/data/physiology.json</code>. Where simplified mathematical approximations are used, an explicit <strong>Illustrative</strong> badge is rendered.
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-3">
                  Primary Literature & Clinical Reference Authorities
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <div className="font-semibold text-sky-300">1. OpenStax Anatomy and Physiology 2e (Rice University)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Peer-reviewed open textbook providing baseline adult cardiac output, stroke volume, respiratory tidal volumes, GI transit durations, neuronal action potential voltages, and glomerular filtration rates.
                    </p>
                    <a href="https://openstax.org/details/books/anatomy-and-physiology-2e" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">
                      <span>https://openstax.org/details/books/anatomy-and-physiology-2e</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <div className="font-semibold text-sky-300">2. NIH / National Library of Medicine (MedlinePlus & StatPearls)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Clinical reference ranges for pediatric vs. adult vital signs, 24-hour urinary volume norms, core body temperature, deep tendon reflex latency (21 ms), and stereological alveolar counts (Ochs et al., PubMed 14512270).
                    </p>
                    <a href="https://medlineplus.gov/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">
                      <span>https://medlineplus.gov/</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <div className="font-semibold text-sky-300">3. Centers for Disease Control and Prevention (CDC)</div>
                    <p className="text-slate-400 leading-relaxed">
                      Clinical thresholds for systolic/diastolic blood pressure, fasting blood glucose (70–99 mg/dL), BMI screening categories and limitations, 20-second handwashing efficacy, and age-specific sleep duration recommendations.
                    </p>
                    <a href="https://www.cdc.gov/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">
                      <span>https://www.cdc.gov/</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1">
                    <div className="font-semibold text-sky-300">4. World Health Organization (WHO) & 3D Open Repositories</div>
                    <p className="text-slate-400 leading-relaxed">
                      Global WASH/hygiene standards and open 3D anatomical reference ontologies (NIH 3D Print Exchange CC0/CC-BY, Z-Anatomy CC BY-SA 4.0, BodyParts3D). All active built-in procedural 3D meshes are CC0 / MIT (`ASSETS.md`).
                    </p>
                    <a href="https://3d.nih.gov/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline inline-flex items-center gap-1">
                      <span>https://3d.nih.gov/</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Complete physiology.json Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-3">
                  All Cited Parameters in <code>src/data/physiology.json</code>
                </h3>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <th className="p-2.5">Parameter</th>
                        <th className="p-2.5">Value & Unit</th>
                        <th className="p-2.5">Normal Range</th>
                        <th className="p-2.5">Confidence</th>
                        <th className="p-2.5">Cited Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 font-mono">
                      {Object.values(PHYSIOLOGY_DATA).map((item) => (
                        <tr key={item.id} className="hover:bg-slate-950/50">
                          <td className="p-2.5 font-sans text-slate-200 font-medium">{item.label}</td>
                          <td className="p-2.5 text-sky-300">
                            {item.value.toLocaleString()} {item.unit}
                          </td>
                          <td className="p-2.5 text-slate-400">
                            {item.range[0].toLocaleString()}–{item.range[1].toLocaleString()}
                          </td>
                          <td className="p-2.5 font-sans">
                            <ConfidenceBadge confidence={item.confidence} />
                          </td>
                          <td className="p-2.5 font-sans">
                            <a
                              href={item.source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sky-400 hover:underline inline-flex items-center gap-1"
                            >
                              <span>{item.source.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* System-by-System Known Limitations */}
              <div>
                <h3 className="text-sm font-bold text-slate-100 mb-3">
                  Known Model Limitations by System (Hard Rule #6)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.values(SYSTEMS_METADATA).map((sys) => (
                    <div key={sys.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
                      <div className="font-semibold text-slate-200">{sys.name}</div>
                      <ul className="list-disc pl-4 text-slate-400 space-y-1">
                        {sys.modelLimits.map((lim, i) => (
                          <li key={i}>{lim}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 2. COMPARE MODE */}
          {activeModal === 'compare' && (() => {
            const pair = getComparePair();
            const mA = computePhysiologyMetrics(pair.stateA);
            const mB = computePhysiologyMetrics(pair.stateB);
            return (
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {[
                    ['rest_vs_exercise', 'Rest vs. Vigorous Exercise'],
                    ['young_vs_older', 'Young Adult vs. Older Adult (65+)'],
                    ['hydrated_vs_dehydrated', 'Well-Hydrated vs. Dehydrated'],
                    ['normal_vs_stenosis', 'Patent Vessel vs. 35% Plaque Stenosis'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setComparePreset(id as typeof comparePreset)}
                      className={`px-3 py-1.5 rounded-lg font-medium border cursor-pointer ${
                        comparePreset === id
                          ? 'bg-sky-500 text-slate-950 border-sky-400 font-semibold'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: pair.titleA, m: mA },
                    { title: pair.titleB, m: mB },
                  ].map((col, idx) => (
                    <div key={idx} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <h3 className="text-sm font-bold text-sky-300 border-b border-slate-800 pb-2">
                        {col.title}
                      </h3>
                      <div className="grid grid-cols-2 gap-2.5 font-mono">
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <div className="text-slate-400 font-sans text-[11px]">Heart Rate</div>
                          <div className="text-sm font-bold text-slate-100">{col.m.heartRateBpm} bpm</div>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <div className="text-slate-400 font-sans text-[11px]">Cardiac Output</div>
                          <div className="text-sm font-bold text-emerald-400">{col.m.cardiacOutputLMin} L/min</div>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <div className="text-slate-400 font-sans text-[11px]">Blood Pressure</div>
                          <div className="text-sm font-bold text-slate-100">
                            {col.m.systolicBpMmHg}/{col.m.diastolicBpMmHg} mmHg
                          </div>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <div className="text-slate-400 font-sans text-[11px]">Minute Ventilation</div>
                          <div className="text-sm font-bold text-sky-400">{col.m.minuteVentilationLMin} L/min</div>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <div className="text-slate-400 font-sans text-[11px]">Renal GFR</div>
                          <div className="text-sm font-bold text-amber-300">{col.m.gfrMlMin} mL/min</div>
                        </div>
                        <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                          <div className="text-slate-400 font-sans text-[11px]">Relative Vessel Flow</div>
                          <div className="text-sm font-bold text-rose-300">
                            {(col.m.relativeVesselFlow * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* 3. A DAY IN THE BODY (24-HOUR CIRCADIAN TIMELINE) */}
          {activeModal === 'day_timeline' && (
            <div className="space-y-4">
              <p className="text-slate-300 leading-relaxed">
                Select any circadian checkpoint below to synchronize the 3D body simulator with that time of day’s meal bolus, autonomic tone, hormone balance, and physical activity:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {DAY_IN_THE_BODY_EVENTS.map((ev) => (
                  <div
                    key={ev.hour}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-amber-400 font-semibold">{ev.timeLabel}</span>
                        <span className="text-slate-400">Activity: {ev.overrides.activityLevel}%</span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-100">{ev.title}</h3>
                      <p className="text-slate-400 leading-relaxed">{ev.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        applyCircadianEvent(ev.hour);
                        setActiveModal('none');
                      }}
                      className="w-full py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Load {ev.timeLabel} State in Simulator
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. GUIDED LESSONS & QUIZZES */}
          {activeModal === 'lessons' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <div>
                  <div className="text-sm font-bold text-slate-100">System Mastery Progress</div>
                  <div className="text-slate-400">Progress is automatically saved in browser localStorage.</div>
                </div>
                <div className="font-mono text-sm font-bold text-emerald-400">
                  {completedQuizIds.length} / {SYSTEM_QUIZZES.length} Completed
                </div>
              </div>

              <div className="space-y-4">
                {SYSTEM_QUIZZES.map((q, idx) => {
                  const chosen = selectedAnswers[q.id];
                  const isCorrect = chosen === q.correctIndex;
                  return (
                    <div key={q.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sky-400 font-semibold">
                          Question {idx + 1} · {SYSTEMS_METADATA[q.system].name}
                        </span>
                        {completedQuizIds.includes(q.id) && (
                          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mastered</span>
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-slate-100">{q.question}</h3>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oIdx) => {
                          const selected = chosen === oIdx;
                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => {
                                setSelectedAnswers((prev) => ({ ...prev, [q.id]: oIdx }));
                                if (oIdx === q.correctIndex) {
                                  markQuizCompleted(q.id);
                                }
                              }}
                              className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                                selected
                                  ? oIdx === q.correctIndex
                                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                                    : 'bg-rose-950/60 border-rose-500 text-rose-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {chosen !== undefined && (
                        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 space-y-1">
                          <div className={isCorrect ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                            {isCorrect ? 'Correct!' : 'Review Explanation:'}
                          </div>
                          <p>{q.explanation}</p>
                          <div className="text-[11px] text-slate-500">Source: {q.sourceRef}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. EXCRETION & HYGIENE MODULE (PHASE 7) */}
          {activeModal === 'hygiene' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Droplets className="w-4 h-4" />
                    <span>1. Renal Urine Excretion</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Removes nitrogenous wastes (<strong>urea</strong> from amino acid deamination, <strong>creatinine</strong> from muscle creatine, <strong>uric acid</strong>), excess electrolytes (Na⁺, K⁺, H⁺), and water-soluble metabolites (~1.5 L/day, NIH MedlinePlus).
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                    <Droplets className="w-4 h-4" />
                    <span>2. Eccrine Sweat Evaporation</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Primarily serves hypothalamic <strong>evaporative thermoregulation</strong> (99% water + NaCl, trace lactate and urea). Contrary to popular myths, heavy metals and metabolic toxins are cleared by the liver and kidneys, not sweat glands (OpenStax §5.2).
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
                    <Droplets className="w-4 h-4" />
                    <span>3. Hepatobiliary & Fecal Elimination</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Eliminates undigested dietary fiber, sloughed intestinal epithelial cells, gut microbiota biomass, bile-conjugated <strong>bilirubin</strong> (stercobilin from recycled erythrocytes), and unabsorbed cholesterol (OpenStax §23.5).
                  </p>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-100">
                  Evidence-Based Hygiene & Daily Habit Scenarios (CDC / WHO Guidance)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-semibold text-emerald-300">Handwashing with Soap (≥20 Seconds)</div>
                    <p className="text-slate-400">
                      Surfactant micelles disrupt lipid envelopes of respiratory viruses and lift enteric pathogens from epidermal ridges, reducing diarrheal illness by ~30% and respiratory infections by ~20% (CDC Clean Hands Guidance).
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-semibold text-sky-300">Oral Biofilm & Dental Hygiene (2x Daily Fluoride)</div>
                    <p className="text-slate-400">
                      Mechanical disruption of <em>Streptococcus mutans</em> dental plaque prevents organic acid demineralization of hydroxyapatite enamel and reduces gingival vascular inflammation (CDC / WHO Oral Health).
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-semibold text-amber-300">Restorative Sleep (7–9 Hours Adult)</div>
                    <p className="text-slate-400">
                      Slow-wave sleep downregulates sympathetic cortisol/epinephrine tone, lowers blood pressure ("nocturnal dipping"), and expands astroglial interstitial channels for CNS metabolite clearance (CDC Sleep Guidance).
                    </p>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                    <div className="font-semibold text-teal-300">Consistent Systemic Hydration</div>
                    <p className="text-slate-400">
                      Maintains plasma volume, prevents orthostatic tachycardia, supports mucociliary clearance in the respiratory tract, and prevents renal calcium-oxalate supersaturation (NIH).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
