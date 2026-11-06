import { ANATOMY_PARTS } from '../data/anatomyCatalog';
import { computePhysiologyMetrics, SimulationParameters } from './physiologyMath';

export type SpecialistAgentId =
  | 'skeletal_articular'
  | 'muscular_biomechanics'
  | 'neuro_sensory'
  | 'cardiovascular_hemodynamics'
  | 'respiratory_pneumatic'
  | 'gastrointestinal_metabolic'
  | 'renal_electrolyte'
  | 'endocrine_humoral'
  | 'integumentary_thermal'
  | 'immune_cellular';

export interface EnvironmentInputs {
  ambientTempC: number; // default 22°C (-5 to 45°C)
  physicalWorkload: number; // 0 to 100%
  traumaLevel: number; // 0 to 100% acute tissue/structural trauma
  nourishmentLevel: number; // 0 to 100% caloric/glycogen availability
}

export interface AgentVariable {
  key: string;
  label: string;
  value: number | string;
  unit: string;
  status: 'nominal' | 'elevated' | 'critical';
}

export interface SpecialistAgentState {
  id: SpecialistAgentId;
  codeName: string;
  shortName: string;
  domainSummary: string;
  assignedPartIds: string[];
  assignedPartNames: string[];
  status: 'nominal' | 'compensating' | 'stressed';
  variables: AgentVariable[];
  lastDirectiveReceived: string;
}

export interface CrossSystemDiscrepancy {
  id: string;
  severity: 'moderate' | 'high';
  title: string;
  detectedBy: SpecialistAgentId;
  description: string;
}

export interface CorrectiveControlVector {
  id: string;
  sourceAgent: SpecialistAgentId;
  targetAgent: SpecialistAgentId;
  signalName: string;
  adjustmentSummary: string;
  magnitude: string;
}

export interface BlackboardBusSnapshot {
  tickCount: number;
  dtSeconds: number;
  timestampIso: string;
  environment: EnvironmentInputs;
  agents: Record<SpecialistAgentId, SpecialistAgentState>;
  discrepancies: CrossSystemDiscrepancy[];
  controlVectors: CorrectiveControlVector[];
  homeostasisScore: number; // 0 to 100%
  systemWarnings: string[];
}

export interface AgentAssignmentMetadata {
  id: SpecialistAgentId;
  codeName: string;
  shortName: string;
  domainSummary: string;
  primaryPartIds: string[];
}

export const SPECIALIST_AGENTS_REGISTRY: AgentAssignmentMetadata[] = [
  {
    id: 'skeletal_articular',
    codeName: 'SKELETAL-ARTICULAR AGENT',
    shortName: 'Skeletal-Articular',
    domainSummary: 'Bone density, joint kinematics, structural load, and hematopoiesis in marrow.',
    primaryPartIds: ['skeleton_axial', 'femur_knee_joint'],
  },
  {
    id: 'muscular_biomechanics',
    codeName: 'MUSCULAR-BIOMECHANICS AGENT',
    shortName: 'Muscular-Biomechanics',
    domainSummary: 'Muscle fibers, pennation, ATP consumption, lactic acid, tension, and force output.',
    primaryPartIds: ['skeletal_muscles', 'diaphragm'],
  },
  {
    id: 'neuro_sensory',
    codeName: 'NEURO-SENSORY AGENT',
    shortName: 'Neuro-Sensory',
    domainSummary: 'Action potentials, cranial/peripheral nerves, autonomic balance, and sensory inputs.',
    primaryPartIds: ['brain', 'spinal_cord_nerves'],
  },
  {
    id: 'cardiovascular_hemodynamics',
    codeName: 'CARDIOVASCULAR-HEMODYNAMICS AGENT',
    shortName: 'Cardiovascular',
    domainSummary: 'Cardiac output, stroke volume, systemic vascular resistance, BP, and perfusion.',
    primaryPartIds: ['heart', 'aorta_vena_cava'],
  },
  {
    id: 'respiratory_pneumatic',
    codeName: 'RESPIRATORY-PNEUMATIC AGENT',
    shortName: 'Respiratory-Pneumatic',
    domainSummary: 'Minute ventilation, alveolar diffusion, PaO2/PaCO2 balance, and airway compliance.',
    primaryPartIds: ['lungs'],
  },
  {
    id: 'gastrointestinal_metabolic',
    codeName: 'GASTROINTESTINAL-METABOLIC AGENT',
    shortName: 'GI-Metabolic',
    domainSummary: 'Enteric absorption, enzymatic breakdown, hepatic biotransformation, and glycogen stores.',
    primaryPartIds: ['stomach', 'liver_pancreas', 'intestines'],
  },
  {
    id: 'renal_electrolyte',
    codeName: 'RENAL-ELECTROLYTE AGENT',
    shortName: 'Renal-Electrolyte',
    domainSummary: 'GFR, fluid volume, osmolarity, renin-angiotensin-aldosterone axis, and waste clearance.',
    primaryPartIds: ['kidneys_bladder'],
  },
  {
    id: 'endocrine_humoral',
    codeName: 'ENDOCRINE-HUMORAL AGENT',
    shortName: 'Endocrine-Humoral',
    domainSummary: 'Circulating hormones: cortisol, adrenaline, insulin, glucagon, and thyroxine (T4).',
    primaryPartIds: ['liver_pancreas', 'brain', 'kidneys_bladder'],
  },
  {
    id: 'integumentary_thermal',
    codeName: 'INTEGUMENTARY-THERMAL AGENT',
    shortName: 'Integumentary-Thermal',
    domainSummary: 'Cutaneous blood flow, perspiration, barrier integrity, and thermal radiation.',
    primaryPartIds: ['skin_integument'],
  },
  {
    id: 'immune_cellular',
    codeName: 'IMMUNE-CELLULAR REPAIR AGENT',
    shortName: 'Immune-Cellular',
    domainSummary: 'Cytokines, pathogen phagocytosis, inflammatory response, and tissue regeneration.',
    primaryPartIds: ['lymph_immune_network'],
  },
];

/**
 * Maps every anatomical part ID to its primary governing Specialist Agent and collaborating agents.
 */
export const PART_TO_AGENTS_MAP: Record<
  string,
  { primary: SpecialistAgentId; secondary: SpecialistAgentId[] }
> = {
  heart: {
    primary: 'cardiovascular_hemodynamics',
    secondary: ['neuro_sensory', 'endocrine_humoral', 'respiratory_pneumatic'],
  },
  aorta_vena_cava: {
    primary: 'cardiovascular_hemodynamics',
    secondary: ['renal_electrolyte', 'integumentary_thermal'],
  },
  lungs: {
    primary: 'respiratory_pneumatic',
    secondary: ['cardiovascular_hemodynamics', 'muscular_biomechanics'],
  },
  diaphragm: {
    primary: 'muscular_biomechanics',
    secondary: ['respiratory_pneumatic', 'neuro_sensory'],
  },
  stomach: {
    primary: 'gastrointestinal_metabolic',
    secondary: ['neuro_sensory', 'endocrine_humoral'],
  },
  liver_pancreas: {
    primary: 'endocrine_humoral',
    secondary: ['gastrointestinal_metabolic', 'cardiovascular_hemodynamics'],
  },
  intestines: {
    primary: 'gastrointestinal_metabolic',
    secondary: ['immune_cellular', 'renal_electrolyte'],
  },
  brain: {
    primary: 'neuro_sensory',
    secondary: ['endocrine_humoral', 'cardiovascular_hemodynamics'],
  },
  spinal_cord_nerves: {
    primary: 'neuro_sensory',
    secondary: ['muscular_biomechanics', 'skeletal_articular'],
  },
  skeleton_axial: {
    primary: 'skeletal_articular',
    secondary: ['immune_cellular', 'muscular_biomechanics'],
  },
  femur_knee_joint: {
    primary: 'skeletal_articular',
    secondary: ['muscular_biomechanics', 'neuro_sensory'],
  },
  skeletal_muscles: {
    primary: 'muscular_biomechanics',
    secondary: ['cardiovascular_hemodynamics', 'respiratory_pneumatic', 'skeletal_articular'],
  },
  kidneys_bladder: {
    primary: 'renal_electrolyte',
    secondary: ['cardiovascular_hemodynamics', 'endocrine_humoral'],
  },
  lymph_immune_network: {
    primary: 'immune_cellular',
    secondary: ['cardiovascular_hemodynamics', 'integumentary_thermal'],
  },
  skin_integument: {
    primary: 'integumentary_thermal',
    secondary: ['immune_cellular', 'neuro_sensory'],
  },
};

/**
 * Executes one discrete OmniSoma Orchestration Tick (default dt = 1.0s):
 * 1. Ingests environment inputs (ambientTempC, physicalWorkload, traumaLevel, nourishmentLevel)
 * 2. Gathers state variables from all 10 specialist agents onto the Blackboard Data Bus
 * 3. Identifies cross-system discrepancies
 * 4. Dispatches corrective control vectors across agents
 * 5. Outputs consolidated physiological metrics and warnings
 */
export function runOmniSomaOrchestrationTick(
  params: SimulationParameters,
  env: EnvironmentInputs,
  prevTickCount: number,
  dtSeconds = 1.0,
): BlackboardBusSnapshot {
  const tickCount = prevTickCount + 1;
  const effectiveParams: SimulationParameters = {
    ...params,
    activityLevel: Math.round(params.activityLevel * 0.4 + env.physicalWorkload * 0.6),
    stressLevel: Math.min(100, Math.round(params.stressLevel + env.traumaLevel * 0.55)),
  };

  const baseMetrics = computePhysiologyMetrics(effectiveParams);
  const workRatio = env.physicalWorkload / 100;
  const traumaRatio = env.traumaLevel / 100;
  const nourishRatio = env.nourishmentLevel / 100;
  const tempDelta = env.ambientTempC - 22; // deviation from thermoneutral 22°C

  const discrepancies: CrossSystemDiscrepancy[] = [];
  const controlVectors: CorrectiveControlVector[] = [];
  const systemWarnings: string[] = [];

  // Derived cross-system biomechanical & metabolic variables
  const structuralLoadN = Math.round(params.weightKg * 9.81 * (1 + workRatio * 2.4));
  const marrowHematopoiesisRate = Number((2.4 + workRatio * 0.6 + traumaRatio * 1.1).toFixed(2)); // million RBC/s

  const atpConsumptionMmolMin = Number((1.2 + workRatio * 14.5).toFixed(1));
  const muscleLactateMmolL = Number((1.0 + Math.pow(workRatio, 1.6) * 8.5).toFixed(1));
  const muscleForceOutputN = Math.round(280 + workRatio * 1450);

  const sympatheticTonePct = Math.min(98, Math.round(25 + workRatio * 55 + traumaRatio * 40 + Math.max(0, tempDelta) * 0.8));
  const parasympatheticTonePct = Math.max(2, 100 - sympatheticTonePct);

  // Systemic Vascular Resistance (SVR in dyn·s·cm⁻⁵)
  const svrDyn = Math.round(
    ((baseMetrics.meanArterialPressureMmHg - 4) / Math.max(2, baseMetrics.cardiacOutputLMin)) * 80,
  );

  // PaO2 and PaCO2
  const paO2MmHg = Math.round(96 - workRatio * 8 - (params.vesselStenosisPercent > 25 ? 6 : 0));
  const paCO2MmHg = Math.round(40 + workRatio * 6);
  const airwayCompliance = Number((0.2 - traumaRatio * 0.05).toFixed(2)); // L/cmH2O

  // Hepatic glycogen & biotransformation
  const hepaticGlycogenGrams = Math.round(95 * nourishRatio + 15 * (1 - workRatio));
  const hepaticClearanceIndex = Number((1.0 - traumaRatio * 0.18).toFixed(2));

  // Renal osmolarity & RAAS
  const hydrationRatio = params.hydrationLevel / 100;
  const plasmaOsmolarity = Math.round(298 - hydrationRatio * 18 + workRatio * 6);
  const raasActivationPct = Math.min(100, Math.round((1 - hydrationRatio) * 75 + traumaRatio * 35));

  // Endocrine hormones
  const cortisolUgDl = Number((11 + traumaRatio * 22 + workRatio * 8).toFixed(1));
  const adrenalinePgMl = Math.round(45 + workRatio * 260 + traumaRatio * 310);
  const thyroxineUgDl = Number((7.8 + (tempDelta < 0 ? Math.abs(tempDelta) * 0.12 : 0)).toFixed(1));

  // Integumentary thermal
  const cutaneousBloodFlowLMin = Number(
    Math.max(0.2, 0.45 + Math.max(0, tempDelta) * 0.07 + workRatio * 1.1 - traumaRatio * 0.25).toFixed(2),
  );
  const barrierIntegrityPct = Math.max(30, Math.round(100 - env.traumaLevel * 0.7));
  const thermalRadiationWm2 = Math.round(58 + Math.max(0, tempDelta) * 3.5 + workRatio * 140);

  // Immune-Cellular Repair
  const cytokineIl6PgMl = Number((1.8 + traumaRatio * 65 + workRatio * 4.5).toFixed(1));
  const phagocytosisRatePct = Math.min(100, Math.round(18 + traumaRatio * 75));
  const tissueRegenIndex = Number((1.0 + traumaRatio * 2.4 * nourishRatio).toFixed(2));

  // =========================================================================
  // STEP 3 & 4: IDENTIFY CROSS-SYSTEM DISCREPANCIES & DISPATCH CONTROL VECTORS
  // =========================================================================
  if (muscleLactateMmolL > 4.0 || env.physicalWorkload >= 50) {
    discrepancies.push({
      id: 'disc_o2_debt',
      severity: muscleLactateMmolL > 6.5 ? 'high' : 'moderate',
      title: 'Muscular Oxygen Debt & Lactate Accumulation',
      detectedBy: 'muscular_biomechanics',
      description: `Skeletal muscle ATP turnover (${atpConsumptionMmolMin} mmol/min) and lactate (${muscleLactateMmolL} mmol/L) exceed baseline perfusion.`,
    });
    controlVectors.push(
      {
        id: 'vec_muscle_to_cardio',
        sourceAgent: 'muscular_biomechanics',
        targetAgent: 'cardiovascular_hemodynamics',
        signalName: 'Metaboreflex Vasodilation & CO Demand',
        adjustmentSummary: 'Elevate heart rate & stroke volume; dilate skeletal muscle arterioles.',
        magnitude: `+${Math.round(workRatio * 85)} bpm / CO ${baseMetrics.cardiacOutputLMin} L/min`,
      },
      {
        id: 'vec_muscle_to_resp',
        sourceAgent: 'muscular_biomechanics',
        targetAgent: 'respiratory_pneumatic',
        signalName: 'Chemoreceptor H⁺ / PaCO₂ Drive',
        adjustmentSummary: 'Increase diaphragm excursion and respiratory frequency to blow off CO₂.',
        magnitude: `VE → ${baseMetrics.minuteVentilationLMin} L/min`,
      },
    );
  }

  if (plasmaOsmolarity > 290 || params.hydrationLevel < 45) {
    discrepancies.push({
      id: 'disc_osmolarity',
      severity: plasmaOsmolarity > 294 ? 'high' : 'moderate',
      title: 'Hyperosmolarity & Extracellular Volume Depletion',
      detectedBy: 'renal_electrolyte',
      description: `Plasma osmolarity (${plasmaOsmolarity} mOsm/kg) triggers hypothalamic osmoreceptors and juxtaglomerular renin release.`,
    });
    controlVectors.push(
      {
        id: 'vec_renal_to_endo',
        sourceAgent: 'renal_electrolyte',
        targetAgent: 'endocrine_humoral',
        signalName: 'RAAS & Posterior Pituitary ADH Axis',
        adjustmentSummary: 'Up-regulate angiotensin II, aldosterone, and vasopressin aquaporin-2 insertion.',
        magnitude: `RAAS ${raasActivationPct}% active`,
      },
      {
        id: 'vec_renal_to_cardio',
        sourceAgent: 'renal_electrolyte',
        targetAgent: 'cardiovascular_hemodynamics',
        signalName: 'Arteriolar Vasoconstriction Preload Guard',
        adjustmentSummary: 'Maintain Mean Arterial Pressure via SVR modulation.',
        magnitude: `SVR ${svrDyn} dyn·s·cm⁻⁵`,
      },
    );
    systemWarnings.push(`Renal-Electrolyte Alert: Elevated plasma osmolarity (${plasmaOsmolarity} mOsm/kg). Increase hydration.`);
  }

  if (env.traumaLevel > 15) {
    discrepancies.push({
      id: 'disc_trauma_inflammation',
      severity: env.traumaLevel > 50 ? 'high' : 'moderate',
      title: 'Acute Tissue Trauma & Barrier Disruption',
      detectedBy: 'immune_cellular',
      description: `Integumentary barrier integrity at ${barrierIntegrityPct}%; DAMP signals recruiting neutrophils and macrophages.`,
    });
    controlVectors.push(
      {
        id: 'vec_immune_to_endo',
        sourceAgent: 'immune_cellular',
        targetAgent: 'endocrine_humoral',
        signalName: 'HPA-Axis Stress Cytokine Signaling (IL-6)',
        adjustmentSummary: 'Stimulate adrenal cortex cortisol and medullary adrenaline release.',
        magnitude: `Cortisol ${cortisolUgDl} µg/dL · IL-6 ${cytokineIl6PgMl} pg/mL`,
      },
      {
        id: 'vec_immune_to_skeletal',
        sourceAgent: 'immune_cellular',
        targetAgent: 'skeletal_articular',
        signalName: 'Myeloid & Erythroid Marrow Mobilization',
        adjustmentSummary: 'Accelerate trabecular bone marrow hematopoiesis and leukocyte egress.',
        magnitude: `${marrowHematopoiesisRate}M cells/s`,
      },
    );
    systemWarnings.push(`Immune-Cellular Alert: Trauma load (${env.traumaLevel}%) active — acute inflammatory cascade engaged.`);
  }

  if (env.ambientTempC > 28 || baseMetrics.coreTempC >= 37.8) {
    discrepancies.push({
      id: 'disc_thermal_load',
      severity: baseMetrics.coreTempC >= 38.2 ? 'high' : 'moderate',
      title: 'Core Hyperthermia & Cutaneous Heat Dissipation Demand',
      detectedBy: 'integumentary_thermal',
      description: `Core temperature (${baseMetrics.coreTempC}°C) in ${env.ambientTempC}°C ambient environment requires evaporative cooling.`,
    });
    controlVectors.push({
      id: 'vec_neuro_to_skin',
      sourceAgent: 'neuro_sensory',
      targetAgent: 'integumentary_thermal',
      signalName: 'Hypothalamic Cholinergic Sudomotor Drive',
      adjustmentSummary: 'Dilate dermal arterioles and increase eccrine sweat secretion.',
      magnitude: `Cutaneous flow ${cutaneousBloodFlowLMin} L/min · Sweat ${baseMetrics.sweatRateMlHr} mL/h`,
    });
  }

  if (hepaticGlycogenGrams < 45 || env.nourishmentLevel < 35) {
    discrepancies.push({
      id: 'disc_glycogen_depletion',
      severity: 'moderate',
      title: 'Hepatic Glycogen Depletion & Catabolic Shift',
      detectedBy: 'gastrointestinal_metabolic',
      description: `Hepatic glycogen reserve (${hepaticGlycogenGrams} g) low; pancreatic alpha cells increasing glucagon secretion.`,
    });
    controlVectors.push({
      id: 'vec_endo_to_gi',
      sourceAgent: 'endocrine_humoral',
      targetAgent: 'gastrointestinal_metabolic',
      signalName: 'Glucagon Glycogenolysis & Gluconeogenesis Vector',
      adjustmentSummary: 'Mobilize hepatic glucose output to preserve cerebral ATP supply.',
      magnitude: `Glucagon ${baseMetrics.glucagonRelativeLevel}% · Glucose ${baseMetrics.bloodGlucoseMgDl} mg/dL`,
    });
  }

  // Ensure at least 2 baseline homeostatic vectors are always visible even at calm rest
  if (controlVectors.length === 0) {
    controlVectors.push(
      {
        id: 'vec_basal_baroreflex',
        sourceAgent: 'neuro_sensory',
        targetAgent: 'cardiovascular_hemodynamics',
        signalName: 'Vagal Baroreceptor Sinus Rhythm Pacing',
        adjustmentSummary: 'Maintain resting SA-node vagal brake and normotensive perfusion.',
        magnitude: `HR ${baseMetrics.heartRateBpm} bpm · MAP ${baseMetrics.meanArterialPressureMmHg} mmHg`,
      },
      {
        id: 'vec_basal_insulin_glucagon',
        sourceAgent: 'endocrine_humoral',
        targetAgent: 'gastrointestinal_metabolic',
        signalName: 'Islet Postprandial Homeostatic Loop',
        adjustmentSummary: 'Balance hepatic glycogenesis with peripheral GLUT4 glucose uptake.',
        magnitude: `Glucose ${baseMetrics.bloodGlucoseMgDl} mg/dL`,
      },
    );
  }

  const getPartNames = (ids: string[]) =>
    ids.map((id) => ANATOMY_PARTS.find((p) => p.id === id)?.name.split(' (')[0] || id);

  const findLastDirective = (agentId: SpecialistAgentId, fallback: string) => {
    const vec = controlVectors.find((v) => v.targetAgent === agentId);
    return vec ? `${vec.signalName}: ${vec.adjustmentSummary}` : fallback;
  };

  const agents: Record<SpecialistAgentId, SpecialistAgentState> = {
    skeletal_articular: {
      id: 'skeletal_articular',
      codeName: 'SKELETAL-ARTICULAR AGENT',
      shortName: 'Skeletal-Articular',
      domainSummary: 'Bone density, joint kinematics, structural load, hematopoiesis in marrow.',
      assignedPartIds: ['skeleton_axial', 'femur_knee_joint'],
      assignedPartNames: getPartNames(['skeleton_axial', 'femur_knee_joint']),
      status: structuralLoadN > 1400 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'skeletal_articular',
        'Maintain trabecular calcium homeostasis and synovial joint lubrication.',
      ),
      variables: [
        { key: 'bone_density', label: 'Trabecular Bone Density', value: `${Math.round(baseMetrics.trabecularBoneDensityIndex * 100)}`, unit: '% idx', status: 'nominal' },
        { key: 'structural_load', label: 'Axial Compressive Load', value: structuralLoadN, unit: 'N', status: structuralLoadN > 1500 ? 'elevated' : 'nominal' },
        { key: 'hematopoiesis', label: 'Marrow Hematopoiesis', value: marrowHematopoiesisRate, unit: 'M RBC/s', status: traumaRatio > 0.3 ? 'elevated' : 'nominal' },
      ],
    },
    muscular_biomechanics: {
      id: 'muscular_biomechanics',
      codeName: 'MUSCULAR-BIOMECHANICS AGENT',
      shortName: 'Muscular-Biomechanics',
      domainSummary: 'Muscle fibers, pennation, ATP consumption, lactic acid, tension, force output.',
      assignedPartIds: ['skeletal_muscles', 'diaphragm'],
      assignedPartNames: getPartNames(['skeletal_muscles', 'diaphragm']),
      status: muscleLactateMmolL > 4.0 ? 'stressed' : workRatio > 0.3 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'muscular_biomechanics',
        'Modulate motor-unit recruitment and cross-bridge sarcomere cycling.',
      ),
      variables: [
        { key: 'atp_use', label: 'Myofibrillar ATP Turnover', value: atpConsumptionMmolMin, unit: 'mmol/min', status: atpConsumptionMmolMin > 8 ? 'elevated' : 'nominal' },
        { key: 'lactate', label: 'Intramuscular Lactate', value: muscleLactateMmolL, unit: 'mmol/L', status: muscleLactateMmolL > 4 ? 'elevated' : 'nominal' },
        { key: 'force_output', label: 'Peak Contractile Force', value: muscleForceOutputN, unit: 'N', status: 'nominal' },
      ],
    },
    neuro_sensory: {
      id: 'neuro_sensory',
      codeName: 'NEURO-SENSORY AGENT',
      shortName: 'Neuro-Sensory',
      domainSummary: 'Action potentials, cranial/peripheral nerves, autonomic balance, sensory inputs.',
      assignedPartIds: ['brain', 'spinal_cord_nerves'],
      assignedPartNames: getPartNames(['brain', 'spinal_cord_nerves']),
      status: sympatheticTonePct > 70 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'neuro_sensory',
        'Integrate proprioceptive, baroreceptor, and chemoreceptor afferent streams.',
      ),
      variables: [
        { key: 'firing_rate', label: 'Cortical/Motor Firing', value: baseMetrics.neuralFiringHz, unit: 'Hz', status: baseMetrics.neuralFiringHz > 55 ? 'elevated' : 'nominal' },
        { key: 'autonomic_bal', label: 'Symp / Parasymp Ratio', value: `${sympatheticTonePct}/${parasympatheticTonePct}`, unit: '%', status: sympatheticTonePct > 70 ? 'elevated' : 'nominal' },
        { key: 'reflex_arc', label: 'Proprioceptive Latency', value: 21, unit: 'ms', status: 'nominal' },
      ],
    },
    cardiovascular_hemodynamics: {
      id: 'cardiovascular_hemodynamics',
      codeName: 'CARDIOVASCULAR-HEMODYNAMICS AGENT',
      shortName: 'Cardiovascular',
      domainSummary: 'Cardiac output, stroke volume, systemic vascular resistance, BP, perfusion.',
      assignedPartIds: ['heart', 'aorta_vena_cava'],
      assignedPartNames: getPartNames(['heart', 'aorta_vena_cava']),
      status:
        params.vesselStenosisPercent > 20
          ? 'stressed'
          : baseMetrics.heartRateBpm > 110
            ? 'compensating'
            : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'cardiovascular_hemodynamics',
        'Synchronize 4-chamber Frank-Starling stroke volume with tissue O₂ demand.',
      ),
      variables: [
        { key: 'cardiac_output', label: 'Cardiac Output (CO)', value: baseMetrics.cardiacOutputLMin, unit: 'L/min', status: baseMetrics.cardiacOutputLMin > 10 ? 'elevated' : 'nominal' },
        { key: 'svr', label: 'Systemic Vascular Res.', value: svrDyn, unit: 'dyn·s/cm⁵', status: svrDyn > 1400 ? 'elevated' : 'nominal' },
        { key: 'map_bp', label: 'Arterial BP (MAP)', value: `${baseMetrics.systolicBpMmHg}/${baseMetrics.diastolicBpMmHg} (${baseMetrics.meanArterialPressureMmHg})`, unit: 'mmHg', status: baseMetrics.systolicBpMmHg > 135 ? 'elevated' : 'nominal' },
      ],
    },
    respiratory_pneumatic: {
      id: 'respiratory_pneumatic',
      codeName: 'RESPIRATORY-PNEUMATIC AGENT',
      shortName: 'Respiratory-Pneumatic',
      domainSummary: 'Minute ventilation, alveolar diffusion, PaO2/PaCO2 balance, airway compliance.',
      assignedPartIds: ['lungs'],
      assignedPartNames: getPartNames(['lungs']),
      status: baseMetrics.minuteVentilationLMin > 22 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'respiratory_pneumatic',
        'Match alveolar ventilation (VA) to pulmonary capillary perfusion (Q).',
      ),
      variables: [
        { key: 'minute_vent', label: 'Minute Ventilation (VE)', value: baseMetrics.minuteVentilationLMin, unit: 'L/min', status: baseMetrics.minuteVentilationLMin > 20 ? 'elevated' : 'nominal' },
        { key: 'blood_gases', label: 'Arterial PaO₂ / PaCO₂', value: `${paO2MmHg} / ${paCO2MmHg}`, unit: 'mmHg', status: paO2MmHg < 90 ? 'elevated' : 'nominal' },
        { key: 'compliance', label: 'Pulmonary Compliance', value: airwayCompliance, unit: 'L/cmH₂O', status: 'nominal' },
      ],
    },
    gastrointestinal_metabolic: {
      id: 'gastrointestinal_metabolic',
      codeName: 'GASTROINTESTINAL-METABOLIC AGENT',
      shortName: 'GI-Metabolic',
      domainSummary: 'Enteric absorption, enzymatic breakdown, hepatic biotransformation, glycogen stores.',
      assignedPartIds: ['stomach', 'liver_pancreas', 'intestines'],
      assignedPartNames: getPartNames(['stomach', 'liver_pancreas', 'intestines']),
      status: hepaticGlycogenGrams < 45 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'gastrointestinal_metabolic',
        'Coordinate peristaltic bolus transit, villous absorption, and portal glycogen storage.',
      ),
      variables: [
        { key: 'glycogen', label: 'Hepatic Glycogen Store', value: hepaticGlycogenGrams, unit: 'g', status: hepaticGlycogenGrams < 45 ? 'elevated' : 'nominal' },
        { key: 'enteric_abs', label: 'Enteric Glucose Uptake', value: baseMetrics.carbAbsorptionRate, unit: '% rate', status: 'nominal' },
        { key: 'biotrans', label: 'Hepatic Clearance Idx', value: hepaticClearanceIndex, unit: 'idx', status: 'nominal' },
      ],
    },
    renal_electrolyte: {
      id: 'renal_electrolyte',
      codeName: 'RENAL-ELECTROLYTE AGENT',
      shortName: 'Renal-Electrolyte',
      domainSummary: 'GFR, fluid volume, osmolarity, renin-angiotensin-aldosterone axis, waste clearance.',
      assignedPartIds: ['kidneys_bladder'],
      assignedPartNames: getPartNames(['kidneys_bladder']),
      status: plasmaOsmolarity > 290 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'renal_electrolyte',
        'Autoregulate glomerular filtration and tubular Na⁺/H₂O reabsorption.',
      ),
      variables: [
        { key: 'gfr', label: 'Glomerular Filtration', value: baseMetrics.gfrMlMin, unit: 'mL/min', status: baseMetrics.gfrMlMin < 90 ? 'elevated' : 'nominal' },
        { key: 'osmolarity', label: 'Plasma Osmolarity', value: plasmaOsmolarity, unit: 'mOsm/kg', status: plasmaOsmolarity > 292 ? 'elevated' : 'nominal' },
        { key: 'raas', label: 'RAAS Axis Drive', value: raasActivationPct, unit: '%', status: raasActivationPct > 50 ? 'elevated' : 'nominal' },
      ],
    },
    endocrine_humoral: {
      id: 'endocrine_humoral',
      codeName: 'ENDOCRINE-HUMORAL AGENT',
      shortName: 'Endocrine-Humoral',
      domainSummary: 'Circulating hormones (cortisol, adrenaline, insulin, glucagon, thyroxine).',
      assignedPartIds: ['liver_pancreas', 'brain', 'kidneys_bladder'],
      assignedPartNames: getPartNames(['liver_pancreas', 'brain', 'kidneys_bladder']),
      status: cortisolUgDl > 22 || adrenalinePgMl > 180 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'endocrine_humoral',
        'Maintain glycemic euglycemia and neuroendocrine stress adaptation.',
      ),
      variables: [
        { key: 'cortisol_adr', label: 'Cortisol / Adrenaline', value: `${cortisolUgDl} µg/dL · ${adrenalinePgMl}`, unit: 'pg/mL', status: cortisolUgDl > 22 ? 'elevated' : 'nominal' },
        { key: 'ins_gluc', label: 'Insulin / Glucagon', value: `${baseMetrics.insulinRelativeLevel}% / ${baseMetrics.glucagonRelativeLevel}%`, unit: 'rel', status: 'nominal' },
        { key: 'thyroxine', label: 'Free Thyroxine (T4)', value: thyroxineUgDl, unit: 'µg/dL', status: 'nominal' },
      ],
    },
    integumentary_thermal: {
      id: 'integumentary_thermal',
      codeName: 'INTEGUMENTARY-THERMAL AGENT',
      shortName: 'Integumentary-Thermal',
      domainSummary: 'Cutaneous blood flow, perspiration, barrier integrity, thermal radiation.',
      assignedPartIds: ['skin_integument'],
      assignedPartNames: getPartNames(['skin_integument']),
      status: barrierIntegrityPct < 80 ? 'stressed' : baseMetrics.coreTempC >= 37.7 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'integumentary_thermal',
        'Regulate dermal arteriovenous anastomoses and eccrine sweat evaporation.',
      ),
      variables: [
        { key: 'skin_flow', label: 'Cutaneous Perfusion', value: cutaneousBloodFlowLMin, unit: 'L/min', status: cutaneousBloodFlowLMin > 1.0 ? 'elevated' : 'nominal' },
        { key: 'barrier', label: 'Epidermal Barrier', value: barrierIntegrityPct, unit: '%', status: barrierIntegrityPct < 85 ? 'critical' : 'nominal' },
        { key: 'radiation', label: 'Thermal Flux & Sweat', value: `${thermalRadiationWm2} W/m² · ${baseMetrics.sweatRateMlHr}`, unit: 'mL/h', status: 'nominal' },
      ],
    },
    immune_cellular: {
      id: 'immune_cellular',
      codeName: 'IMMUNE-CELLULAR REPAIR AGENT',
      shortName: 'Immune-Cellular',
      domainSummary: 'Cytokines, pathogen phagocytosis, inflammatory response, tissue regeneration.',
      assignedPartIds: ['lymph_immune_network'],
      assignedPartNames: getPartNames(['lymph_immune_network']),
      status: env.traumaLevel > 25 ? 'stressed' : env.traumaLevel > 5 ? 'compensating' : 'nominal',
      lastDirectiveReceived: findLastDirective(
        'immune_cellular',
        'Patrol lymphatic nodes, clear cellular debris, and coordinate tissue repair.',
      ),
      variables: [
        { key: 'cytokines', label: 'IL-6 / TNF-α Cytokines', value: cytokineIl6PgMl, unit: 'pg/mL', status: cytokineIl6PgMl > 15 ? 'elevated' : 'nominal' },
        { key: 'phagocytosis', label: 'Macrophage Phagocytosis', value: phagocytosisRatePct, unit: '% act', status: phagocytosisRatePct > 45 ? 'elevated' : 'nominal' },
        { key: 'regen', label: 'Tissue Regeneration Idx', value: tissueRegenIndex, unit: 'x base', status: 'nominal' },
      ],
    },
  };

  // Compute consolidated homeostasis stability score
  const penalty =
    discrepancies.reduce((acc, d) => acc + (d.severity === 'high' ? 18 : 9), 0) +
    (params.vesselStenosisPercent > 0 ? 8 : 0);
  const homeostasisScore = Math.max(15, Math.min(100, 100 - penalty));

  return {
    tickCount,
    dtSeconds,
    timestampIso: new Date().toISOString(),
    environment: env,
    agents,
    discrepancies,
    controlVectors,
    homeostasisScore,
    systemWarnings,
  };
}
