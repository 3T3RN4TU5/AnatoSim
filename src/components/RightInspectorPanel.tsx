import React, { useMemo } from 'react';
import {
  AlertCircle,
  BookOpen,
  Cpu,
  ExternalLink,
  Play,
  Search,
  Sliders,
  UserCheck,
} from 'lucide-react';
import {
  AgeGroup,
  ANATOMY_PARTS,
  BiologicalSex,
  PHYSIOLOGY_DATA,
  SYSTEMS_METADATA,
  SystemId,
} from '../data/anatomyCatalog';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { computePhysiologyMetrics } from '../sim/physiologyMath';
import {
  PART_TO_AGENTS_MAP,
  runOmniSomaOrchestrationTick,
  SPECIALIST_AGENTS_REGISTRY,
} from '../sim/omniSomaOrchestrator';
import { ConfidenceBadge } from './ConfidenceBadge';
import { LiveTelemetryAndZoom } from './LiveTelemetryAndZoom';
import { SimulationDashboard } from './SimulationDashboard';

const SYSTEM_ORDER: SystemId[] = [
  'circulatory',
  'respiratory',
  'digestive',
  'nervous',
  'musculoskeletal',
  'renal_endocrine_immune',
];

export const RightInspectorPanel: React.FC = () => {
  const selectedPartId = useSimulatorStore((s) => s.selectedPartId);
  const selectedSubstructure = useSimulatorStore((s) => s.selectedSubstructure);
  const selectPart = useSimulatorStore((s) => s.selectPart);
  const activeSystem = useSimulatorStore((s) => s.activeSystem);
  const setActiveSystem = useSimulatorStore((s) => s.setActiveSystem);
  const searchQuery = useSimulatorStore((s) => s.searchQuery);
  const setSearchQuery = useSimulatorStore((s) => s.setSearchQuery);
  const params = useSimulatorStore((s) => s.params);
  const updateParams = useSimulatorStore((s) => s.updateParams);
  const setIsPlaying = useSimulatorStore((s) => s.setIsPlaying);
  const setActiveModal = useSimulatorStore((s) => s.setActiveModal);
  const orchestratorEnv = useSimulatorStore((s) => s.orchestratorEnv);
  const orchestratorTickCount = useSimulatorStore((s) => s.orchestratorTickCount);
  const stepOrchestratorTick = useSimulatorStore((s) => s.stepOrchestratorTick);

  const selectedPart = useMemo(
    () => ANATOMY_PARTS.find((p) => p.id === selectedPartId) || ANATOMY_PARTS[0],
    [selectedPartId],
  );

  const filteredParts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return ANATOMY_PARTS;
    return ANATOMY_PARTS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.latinName.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.system.toLowerCase().includes(q),
    );
  }, [searchQuery]);

  const systemMeta = SYSTEMS_METADATA[activeSystem];
  const metrics = useMemo(() => computePhysiologyMetrics(params), [params]);

  const blackboard = useMemo(
    () => runOmniSomaOrchestrationTick(params, orchestratorEnv, orchestratorTickCount - 1, 1.0),
    [params, orchestratorEnv, orchestratorTickCount],
  );

  const partAgentMapping = PART_TO_AGENTS_MAP[selectedPart.id] || {
    primary: 'cardiovascular_hemodynamics',
    secondary: ['neuro_sensory'],
  };
  const primaryAgent = blackboard.agents[partAgentMapping.primary];

  return (
    <aside
      aria-label="Anatomical Inspector & Physiological Simulation Deck"
      className="w-full lg:w-[460px] xl:w-[500px] h-[48vh] lg:h-full bg-slate-950 border-t lg:border-t-0 lg:border-l border-slate-800/90 flex flex-col overflow-hidden shrink-0"
    >
      {/* 1. Search Bar & Quick Organ Selector */}
      <div className="p-3 border-b border-slate-800/90 bg-slate-900/50 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="anatomy-search-input" className="sr-only">
            Search organs, bones, muscles, or vessels
          </label>
          <input
            id="anatomy-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search organ, bone, muscle, or nerve (e.g. Heart, Femur, Brain)..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>

        {/* Accessible Quick-Select Part Strip */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto pb-1"
          role="listbox"
          aria-label="Selectable anatomical structures"
        >
          {filteredParts.map((part) => {
            const active = part.id === selectedPart.id;
            return (
              <button
                key={part.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => selectPart(part.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {part.name.split(' (')[0]}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. System Selector Tabs */}
      <div
        className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-3 gap-1 p-2 bg-slate-900/80 border-b border-slate-800/90"
        role="tablist"
        aria-label="Physiological systems"
      >
        {SYSTEM_ORDER.map((sysId) => {
          const meta = SYSTEMS_METADATA[sysId];
          const isActive = activeSystem === sysId;
          return (
            <button
              key={sysId}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveSystem(sysId)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap truncate cursor-pointer ${
                isActive
                  ? 'bg-slate-800 text-sky-300 font-semibold border border-sky-500/40'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {meta.shortName}
            </button>
          );
        })}
      </div>

      {/* 3. Scrollable Inspector Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* Assigned Autonomous Specialist Agent Card (OmniSoma Blackboard Bus) */}
        {primaryAgent && (
          <section
            aria-label="Assigned Autonomous Specialist Agent"
            className="bg-slate-900/90 border border-sky-500/35 rounded-xl p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Cpu className="w-4 h-4 text-sky-400 shrink-0" />
                <div className="truncate">
                  <div className="text-[11px] text-slate-400">
                    Assigned Body-Part Agent · Tick #{blackboard.tickCount} (dt = 1.0s)
                  </div>
                  <h3 className="text-xs font-bold text-sky-300 truncate">
                    {primaryAgent.codeName}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={stepOrchestratorTick}
                  title="Execute 1.0s physiological orchestration tick"
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-[11px] rounded border border-slate-700 cursor-pointer whitespace-nowrap"
                >
                  +1.0s Tick
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal('omnisoma')}
                  className="px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded cursor-pointer whitespace-nowrap"
                >
                  OmniSoma Bus
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
              {primaryAgent.variables.map((v) => (
                <div
                  key={v.key}
                  className="bg-slate-950/90 border border-slate-800/80 rounded p-2"
                >
                  <div className="text-[10px] text-slate-400 font-sans truncate">{v.label}</div>
                  <div
                    className={`font-semibold truncate ${
                      v.status === 'critical'
                        ? 'text-rose-400'
                        : v.status === 'elevated'
                          ? 'text-amber-300'
                          : 'text-emerald-300'
                    }`}
                  >
                    {v.value} <span className="text-[10px] text-slate-400">{v.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-300 bg-slate-950/70 border border-slate-800/70 rounded px-2.5 py-1.5">
              <span className="text-sky-400 font-semibold">Blackboard Directive: </span>
              {primaryAgent.lastDirectiveReceived}
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-between gap-2">
              <span className="truncate">
                Collaborating Agents:{' '}
                {partAgentMapping.secondary
                  .map((id) => SPECIALIST_AGENTS_REGISTRY.find((a) => a.id === id)?.shortName || id)
                  .join(' · ')}
              </span>
              <span className="font-mono text-emerald-400 shrink-0">
                Homeostasis {blackboard.homeostasisScore}%
              </span>
            </div>
          </section>
        )}

        {/* Real-Time Recharts Simulation Dashboard (Heartbeat, Respiration & SpO2) */}
        <SimulationDashboard />

        {/* Live System Simulation & Micro-Zoom First Above the Fold */}
        <section aria-label="Live System Simulation and Telemetry">
          <LiveTelemetryAndZoom />
        </section>

        {/* Selected Anatomical Part Card */}
        <section
          aria-labelledby="selected-part-heading"
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 space-y-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs text-sky-400 font-medium">
                {selectedPart.latinName} · Layer: {selectedPart.layer.toUpperCase()}
              </div>
              <h2 id="selected-part-heading" className="text-base font-bold text-slate-100 mt-0.5">
                {selectedPart.name}
              </h2>
              {selectedSubstructure && (
                <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/35 text-[11px] text-sky-200">
                  <span className="font-semibold">{selectedSubstructure.nameEn}</span>
                  {selectedSubstructure.nameLatin && (
                    <span className="text-sky-300/80 italic">{selectedSubstructure.nameLatin}</span>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setActiveSystem(selectedPart.system);
                setIsPlaying(true);
              }}
              className="px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate This</span>
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">{selectedPart.summary}</p>
          <p className="text-xs text-slate-400 leading-relaxed">{selectedPart.clinicalNotes}</p>

          {/* Unboxed Connected Systems Metadata */}
          <div className="text-xs text-slate-400 pt-1 border-t border-slate-800/80">
            <span className="text-slate-300 font-medium">Connected Systems: </span>
            {selectedPart.connectedSystems
              .map((s) => SYSTEMS_METADATA[s]?.shortName || s)
              .join(' · ')}
          </div>

          {/* Cited Facts from physiology.json */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Reference Physiology (`physiology.json`)
              </span>
              <button
                type="button"
                onClick={() => setActiveModal('sources')}
                className="text-xs text-sky-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="w-3 h-3" />
                <span>View All Citations</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {selectedPart.factIds.map((fid) => {
                const fact = PHYSIOLOGY_DATA[fid];
                if (!fact) return null;
                return (
                  <div
                    key={fid}
                    className="bg-slate-950/90 border border-slate-800/80 rounded-lg p-2.5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-200 font-medium">{fact.label}</span>
                      <ConfidenceBadge confidence={fact.confidence} />
                    </div>
                    <div className="flex items-center justify-between font-mono text-xs">
                      <span className="text-sky-300 font-semibold">
                        {fact.value.toLocaleString()} {fact.unit}
                      </span>
                      <span className="text-slate-400">
                        Range: {fact.range[0].toLocaleString()}–{fact.range[1].toLocaleString()} {fact.unit}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                      <span className="truncate">{fact.source.title}</span>
                      <a
                        href={fact.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:underline inline-flex items-center gap-0.5 shrink-0 ml-2"
                      >
                        <span>Source</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Life Stages & Body Composition Controls (Phase 8) */}
        <section
          aria-labelledby="life-stages-heading"
          className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-sky-400" />
              <h3 id="life-stages-heading" className="text-xs font-semibold text-slate-200">
                Life Stage, Sex & Body Composition (`SimulationState`)
              </h3>
            </div>
            <span className="font-mono text-xs text-slate-400">
              BMI {metrics.bmi} · {metrics.tdeeKcalDay} kcal/d
            </span>
          </div>

          {/* Age Group Buttons */}
          <div className="grid grid-cols-5 gap-1" role="group" aria-label="Life stage selector">
            {(
              [
                ['infant', 'Infant'],
                ['child', 'Child'],
                ['adolescent', 'Teen'],
                ['adult', 'Adult'],
                ['older_adult', '65+ Yr'],
              ] as [Exclude<AgeGroup, 'all'>, string][]
            ).map(([ageId, label]) => (
              <button
                key={ageId}
                type="button"
                onClick={() => updateParams({ ageGroup: ageId, heartRateOverride: null })}
                className={`py-1.5 px-1.5 rounded text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  params.ageGroup === ageId
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Biological Sex Clinical Toggle & Body Fat / Weight */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
              {(['female', 'male'] as Exclude<BiologicalSex, 'all'>[]).map((sx) => (
                <button
                  key={sx}
                  type="button"
                  onClick={() => updateParams({ sex: sx })}
                  className={`flex-1 py-1 rounded text-xs font-medium capitalize cursor-pointer ${
                    params.sex === sx
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {sx}
                </button>
              ))}
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 font-sans">BMR:</span>
              <span className="text-emerald-400">{metrics.bmrKcalDay} kcal</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <div className="flex justify-between mb-0.5">
                <label htmlFor="weight-slider" className="text-slate-300">
                  Body Mass (Weight)
                </label>
                <span className="font-mono text-slate-200">{params.weightKg} kg</span>
              </div>
              <input
                id="weight-slider"
                type="range"
                min={35}
                max={130}
                value={params.weightKg}
                onChange={(e) => updateParams({ weightKg: Number(e.target.value) })}
                className="w-full accent-sky-500 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between mb-0.5">
                <label htmlFor="bodyfat-slider" className="text-slate-300">
                  Subcutaneous Body Fat %
                </label>
                <span className="font-mono text-amber-300">{params.bodyFatPercent}%</span>
              </div>
              <input
                id="bodyfat-slider"
                type="range"
                min={6}
                max={45}
                value={params.bodyFatPercent}
                onChange={(e) => updateParams({ bodyFatPercent: Number(e.target.value) })}
                className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 bg-slate-950/90 border border-slate-800/80 rounded p-2 leading-relaxed">
            <strong className="text-slate-200">BMI & Energy Formula Note:</strong> BMI ({metrics.bmi} kg/m² — {metrics.bmiCategory}) is a screening ratio (`weight / height²`) that does not distinguish skeletal muscle mass from adipose tissue or fat distribution (CDC). Basal Metabolic Rate uses the cited Mifflin–St Jeor equation (`10×kg + 6.25×cm - 5×age + s`).
          </div>
        </section>

        {/* System Model Limits Panel (Hard Rule #6) */}
        <section
          aria-labelledby="model-limits-heading"
          className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <h3 id="model-limits-heading" className="text-xs font-semibold text-slate-200">
                Model Limits — {systemMeta.shortName} (Simplified Model)
              </h3>
            </div>
            <Sliders className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <ul className="space-y-1.5 text-xs text-slate-400 list-disc pl-4 leading-relaxed">
            {systemMeta.modelLimits.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
};
