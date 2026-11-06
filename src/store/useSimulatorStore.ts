import { create } from 'zustand';
import {
  ANATOMY_LAYERS,
  ANATOMY_PARTS,
  LayerId,
  SystemId,
} from '../data/anatomyCatalog';
import {
  MealType,
  PoseId,
  SimulationParameters,
} from '../sim/physiologyMath';
import {
  EnvironmentInputs,
  PART_TO_AGENTS_MAP,
  SpecialistAgentId,
  SPECIALIST_AGENTS_REGISTRY,
} from '../sim/omniSomaOrchestrator';
import { DAY_IN_THE_BODY_EVENTS } from '../data/lessonsData';

export type QualityTier = 'low' | 'medium' | 'high';
export type SliceAxis = 'none' | 'axial' | 'sagittal' | 'coronal';
export type ActiveModal =
  | 'none'
  | 'omnisoma'
  | 'sources'
  | 'lessons'
  | 'compare'
  | 'day_timeline'
  | 'hygiene';

export interface LayerState {
  visible: boolean;
  opacity: number;
}

export interface SimulatorStoreState {
  // Layer & Dissection Controls
  layers: Record<LayerId, LayerState>;
  xrayMode: boolean;
  isolateSelectedPart: boolean;
  explodedFactor: number; // 0 (assembled) to 1 (exploded layers)
  sliceAxis: SliceAxis;
  slicePosition: number; // -1.0 to +1.0

  // Selection & Active System
  selectedPartId: string;
  selectedSubstructure: { nameEn: string; nameLatin: string } | null;
  atlasLoadedCount: number;
  activeSystem: SystemId;
  searchQuery: string;

  // Time & Playback
  isPlaying: boolean;
  timeSpeedMultiplier: number; // 0.1, 1, 10, 100, 1000
  simulationTimeSeconds: number;

  // OmniSoma Multi-Agent Orchestrator State (dt = 1.0s protocol)
  orchestratorTickCount: number;
  orchestratorAccumulatorSec: number;
  orchestratorEnv: EnvironmentInputs;
  focusedAgentId: SpecialistAgentId;

  // Global Physiological Parameters
  params: SimulationParameters;

  // Compare Mode Preset
  comparePreset: 'rest_vs_exercise' | 'young_vs_older' | 'hydrated_vs_dehydrated' | 'normal_vs_stenosis';

  // Visual & Accessibility Settings
  quality: QualityTier;
  colorBlindSafe: boolean;
  reducedMotion: boolean;
  dockCollapsed: boolean;
  activeModal: ActiveModal;

  // Persisted Quiz Progress
  completedQuizIds: string[];

  // Actions
  toggleLayer: (id: LayerId) => void;
  setLayerOpacity: (id: LayerId, opacity: number) => void;
  resetLayers: () => void;
  applyDissectionPreset: (preset: 'hybrid' | 'ecorche' | 'visceral' | 'surface' | 'skeletal') => void;
  setXrayMode: (enabled: boolean) => void;
  setIsolateSelectedPart: (isolate: boolean) => void;
  setExplodedFactor: (factor: number) => void;
  setSliceAxis: (axis: SliceAxis) => void;
  setSlicePosition: (pos: number) => void;
  selectPart: (partId: string, substructure?: { nameEn: string; nameLatin: string } | null) => void;
  setAtlasLoadedCount: (count: number) => void;
  setActiveSystem: (system: SystemId) => void;
  setSearchQuery: (q: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setTimeSpeedMultiplier: (speed: number) => void;
  advanceSimulationTime: (dtSeconds: number) => void;
  updateParams: (partial: Partial<SimulationParameters>) => void;
  updateOrchestratorEnv: (partial: Partial<EnvironmentInputs>) => void;
  stepOrchestratorTick: () => void;
  setFocusedAgentId: (agentId: SpecialistAgentId) => void;
  triggerKneeJerkReflex: () => void;
  applyCircadianEvent: (hour: number) => void;
  setComparePreset: (preset: SimulatorStoreState['comparePreset']) => void;
  setQuality: (q: QualityTier) => void;
  setColorBlindSafe: (enabled: boolean) => void;
  setReducedMotion: (enabled: boolean) => void;
  setDockCollapsed: (collapsed: boolean) => void;
  setActiveModal: (modal: ActiveModal) => void;
  markQuizCompleted: (quizId: string) => void;
}

const initialLayers = ANATOMY_LAYERS.reduce(
  (acc, layer) => {
    acc[layer.id] = {
      visible: layer.defaultVisible,
      opacity: layer.defaultOpacity,
    };
    return acc;
  },
  {} as Record<LayerId, LayerState>,
);

const loadQuizProgress = (): string[] => {
  try {
    const raw = window.localStorage.getItem('somalab_completed_quizzes');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useSimulatorStore = create<SimulatorStoreState>((set) => ({
  layers: initialLayers,
  xrayMode: false,
  isolateSelectedPart: false,
  explodedFactor: 0,
  sliceAxis: 'none',
  slicePosition: 0.25,

  selectedPartId: 'heart',
  selectedSubstructure: null,
  atlasLoadedCount: 0,
  activeSystem: 'circulatory',
  searchQuery: '',

  isPlaying: true,
  timeSpeedMultiplier: 1,
  simulationTimeSeconds: 0,

  orchestratorTickCount: 1,
  orchestratorAccumulatorSec: 0,
  orchestratorEnv: {
    ambientTempC: 22,
    physicalWorkload: 15,
    traumaLevel: 0,
    nourishmentLevel: 80,
  },
  focusedAgentId: 'cardiovascular_hemodynamics',

  params: {
    ageGroup: 'adult',
    sex: 'female',
    weightKg: 68,
    heightCm: 170,
    bodyFatPercent: 21,
    activityLevel: 15,
    hydrationLevel: 75,
    sleepHours: 8,
    stressLevel: 15,
    heartRateOverride: null,
    systolicBpOverride: null,
    vesselStenosisPercent: 0,
    mealType: 'balanced',
    digestiveElapsedMinutes: 95,
    activePose: 'anatomical_rest',
    reflexTriggerTime: null,
    circadianHour: 10,
    handwashingPracticed: true,
  },

  comparePreset: 'rest_vs_exercise',

  quality: 'medium',
  colorBlindSafe: false,
  reducedMotion: false,
  dockCollapsed: false,
  activeModal: 'none',

  completedQuizIds: typeof window !== 'undefined' ? loadQuizProgress() : [],

  toggleLayer: (id) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [id]: {
          ...state.layers[id],
          visible: !state.layers[id].visible,
        },
      },
    })),

  setLayerOpacity: (id, opacity) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [id]: {
          ...state.layers[id],
          opacity,
          visible: opacity > 0.02 ? true : state.layers[id].visible,
        },
      },
    })),

  resetLayers: () =>
    set({
      layers: initialLayers,
      xrayMode: false,
      isolateSelectedPart: false,
      explodedFactor: 0,
      sliceAxis: 'none',
    }),

  applyDissectionPreset: (preset) =>
    set(() => {
      if (preset === 'ecorche') {
        return {
          xrayMode: false,
          isolateSelectedPart: false,
          layers: {
            skin: { visible: false, opacity: 0.22 },
            fat: { visible: false, opacity: 0.35 },
            muscle: { visible: true, opacity: 0.94 },
            skeleton: { visible: true, opacity: 1.0 },
            organs: { visible: true, opacity: 1.0 },
            vessels: { visible: true, opacity: 0.95 },
            nerves: { visible: false, opacity: 0.9 },
            lymph: { visible: false, opacity: 0.85 },
          },
        };
      }
      if (preset === 'visceral') {
        return {
          xrayMode: false,
          isolateSelectedPart: false,
          layers: {
            skin: { visible: true, opacity: 0.16 },
            fat: { visible: false, opacity: 0.35 },
            muscle: { visible: false, opacity: 0.42 },
            skeleton: { visible: true, opacity: 0.45 },
            organs: { visible: true, opacity: 1.0 },
            vessels: { visible: true, opacity: 1.0 },
            nerves: { visible: true, opacity: 0.95 },
            lymph: { visible: true, opacity: 0.9 },
          },
        };
      }
      if (preset === 'surface') {
        return {
          xrayMode: false,
          isolateSelectedPart: false,
          layers: {
            skin: { visible: true, opacity: 1.0 },
            fat: { visible: false, opacity: 0.35 },
            muscle: { visible: false, opacity: 0.92 },
            skeleton: { visible: true, opacity: 1.0 },
            organs: { visible: true, opacity: 1.0 },
            vessels: { visible: false, opacity: 0.95 },
            nerves: { visible: false, opacity: 0.9 },
            lymph: { visible: false, opacity: 0.85 },
          },
        };
      }
      if (preset === 'skeletal') {
        return {
          xrayMode: false,
          isolateSelectedPart: false,
          layers: {
            skin: { visible: false, opacity: 0.22 },
            fat: { visible: false, opacity: 0.35 },
            muscle: { visible: false, opacity: 0.42 },
            skeleton: { visible: true, opacity: 1.0 },
            organs: { visible: false, opacity: 1.0 },
            vessels: { visible: true, opacity: 0.95 },
            nerves: { visible: true, opacity: 0.95 },
            lymph: { visible: false, opacity: 0.85 },
          },
        };
      }
      return {
        layers: initialLayers,
        xrayMode: false,
        isolateSelectedPart: false,
      };
    }),

  setXrayMode: (xrayMode) => set({ xrayMode }),
  setIsolateSelectedPart: (isolateSelectedPart) => set({ isolateSelectedPart }),
  setExplodedFactor: (explodedFactor) => set({ explodedFactor }),
  setSliceAxis: (sliceAxis) => set({ sliceAxis }),
  setSlicePosition: (slicePosition) => set({ slicePosition }),

  selectPart: (partId, substructure = null) =>
    set((state) => {
      const part = ANATOMY_PARTS.find((p) => p.id === partId);
      if (!part) return state;
      const assigned = PART_TO_AGENTS_MAP[partId];
      return {
        selectedPartId: partId,
        selectedSubstructure: substructure,
        activeSystem: part.system,
        focusedAgentId: assigned ? assigned.primary : state.focusedAgentId,
        layers: {
          ...state.layers,
          [part.layer]: {
            ...state.layers[part.layer],
            visible: true,
          },
        },
      };
    }),

  setAtlasLoadedCount: (atlasLoadedCount) => set({ atlasLoadedCount }),

  setActiveSystem: (activeSystem) =>
    set((state) => {
      const defaultPart = ANATOMY_PARTS.find((p) => p.system === activeSystem);
      const nextLayers = { ...state.layers };
      if (defaultPart) {
        nextLayers[defaultPart.layer] = {
          ...nextLayers[defaultPart.layer],
          visible: true,
        };
      }
      if (activeSystem === 'renal_endocrine_immune') {
        nextLayers.lymph = { ...nextLayers.lymph, visible: true };
      }
      const nextPartId = defaultPart ? defaultPart.id : state.selectedPartId;
      const assigned = PART_TO_AGENTS_MAP[nextPartId];
      return {
        activeSystem,
        selectedPartId: nextPartId,
        focusedAgentId: assigned ? assigned.primary : state.focusedAgentId,
        layers: nextLayers,
      };
    }),

  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setTimeSpeedMultiplier: (timeSpeedMultiplier) => set({ timeSpeedMultiplier }),

  advanceSimulationTime: (dtSeconds) =>
    set((state) => {
      if (!state.isPlaying) return state;
      const scaledDt = dtSeconds * state.timeSpeedMultiplier;
      const nextSimTime = state.simulationTimeSeconds + scaledDt;
      const addMinutes = (scaledDt / 60) * (state.timeSpeedMultiplier >= 10 ? 1 : 0.25);
      const nextDigestiveMin = (state.params.digestiveElapsedMinutes + addMinutes) % 2400;

      // Discrete 1.0s physiological tick counter for OmniSoma Orchestrator
      const nextAcc = state.orchestratorAccumulatorSec + dtSeconds;
      const ticksToAdd = Math.floor(nextAcc);
      return {
        simulationTimeSeconds: nextSimTime,
        orchestratorTickCount: state.orchestratorTickCount + ticksToAdd,
        orchestratorAccumulatorSec: nextAcc - ticksToAdd,
        params: {
          ...state.params,
          digestiveElapsedMinutes: Number(nextDigestiveMin.toFixed(2)),
        },
      };
    }),

  updateParams: (partial) =>
    set((state) => ({
      params: {
        ...state.params,
        ...partial,
      },
      orchestratorEnv:
        partial.activityLevel !== undefined
          ? { ...state.orchestratorEnv, physicalWorkload: partial.activityLevel }
          : state.orchestratorEnv,
    })),

  updateOrchestratorEnv: (partial) =>
    set((state) => {
      const nextEnv = { ...state.orchestratorEnv, ...partial };
      return {
        orchestratorEnv: nextEnv,
        orchestratorTickCount: state.orchestratorTickCount + 1,
        params: {
          ...state.params,
          activityLevel:
            partial.physicalWorkload !== undefined
              ? partial.physicalWorkload
              : state.params.activityLevel,
          stressLevel:
            partial.traumaLevel !== undefined
              ? Math.min(100, Math.round(15 + partial.traumaLevel * 0.7))
              : state.params.stressLevel,
        },
      };
    }),

  stepOrchestratorTick: () =>
    set((state) => ({
      orchestratorTickCount: state.orchestratorTickCount + 1,
      simulationTimeSeconds: state.simulationTimeSeconds + 1.0,
    })),

  setFocusedAgentId: (agentId) =>
    set((state) => {
      const reg = SPECIALIST_AGENTS_REGISTRY.find((a) => a.id === agentId);
      const partId = reg?.primaryPartIds[0] || state.selectedPartId;
      const part = ANATOMY_PARTS.find((p) => p.id === partId);
      return {
        focusedAgentId: agentId,
        selectedPartId: partId,
        activeSystem: part ? part.system : state.activeSystem,
      };
    }),

  triggerKneeJerkReflex: () =>
    set((state) => ({
      selectedPartId: 'spinal_cord_nerves',
      activeSystem: 'nervous',
      focusedAgentId: 'neuro_sensory',
      params: {
        ...state.params,
        reflexTriggerTime: Date.now(),
      },
    })),

  applyCircadianEvent: (hour) =>
    set((state) => {
      const ev = DAY_IN_THE_BODY_EVENTS.find((e) => e.hour === hour);
      if (!ev) return state;
      return {
        params: {
          ...state.params,
          ...ev.overrides,
        },
      };
    }),

  setComparePreset: (comparePreset) => set({ comparePreset }),
  setQuality: (quality) => set({ quality }),
  setColorBlindSafe: (colorBlindSafe) => set({ colorBlindSafe }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setDockCollapsed: (dockCollapsed) => set({ dockCollapsed }),
  setActiveModal: (activeModal) => set({ activeModal }),

  markQuizCompleted: (quizId) =>
    set((state) => {
      if (state.completedQuizIds.includes(quizId)) return state;
      const next = [...state.completedQuizIds, quizId];
      try {
        window.localStorage.setItem('somalab_completed_quizzes', JSON.stringify(next));
      } catch {
        // ignore storage errors
      }
      return { completedQuizIds: next };
    }),
}));

export type { MealType, PoseId };
