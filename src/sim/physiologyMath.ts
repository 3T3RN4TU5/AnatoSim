import { AgeGroup, BiologicalSex, PHYSIOLOGY_DATA, PhysiologyFact } from '../data/anatomyCatalog';

export type MealType = 'balanced' | 'high_carb' | 'high_protein' | 'high_fat';
export type PoseId = 'anatomical_rest' | 'walk_gait' | 'run_sprint' | 'squat_load' | 'bicep_lift';

export interface SimulationParameters {
  ageGroup: Exclude<AgeGroup, 'all'>;
  sex: Exclude<BiologicalSex, 'all'>;
  weightKg: number;
  heightCm: number;
  bodyFatPercent: number;
  activityLevel: number; // 0 (rest) to 100 (maximal sprint)
  hydrationLevel: number; // 0 (dehydrated) to 100 (well hydrated)
  sleepHours: number; // 4 to 10 hours
  stressLevel: number; // 0 (calm) to 100 (high sympathetic drive)
  heartRateOverride: number | null; // null = auto from physiology
  systolicBpOverride: number | null;
  vesselStenosisPercent: number; // 0 to 70% plaque narrowing ("What-if" illustrative)
  mealType: MealType;
  digestiveElapsedMinutes: number; // 0 to 2400 minutes (40 hours)
  activePose: PoseId;
  reflexTriggerTime: number | null; // timestamp of knee-jerk tap
  circadianHour: number; // 0 to 24h for "A Day in the Body"
  handwashingPracticed?: boolean;
}

export interface ComputedPhysiologyMetrics {
  // Circulatory
  heartRateBpm: number;
  strokeVolumeMl: number;
  cardiacOutputLMin: number;
  systolicBpMmHg: number;
  diastolicBpMmHg: number;
  meanArterialPressureMmHg: number;
  bloodVolumeL: number;
  relativeVesselFlow: number; // 1.0 = normal, reduced by Poiseuille r^4 when stenosis > 0
  isStenosisIllustrative: boolean;

  // Respiratory
  respiratoryRateBpm: number;
  tidalVolumeMl: number;
  minuteVentilationLMin: number;
  alveolarPo2MmHg: number;
  alveolarPco2MmHg: number;
  oxygenSaturationPercent: number;

  // Digestive
  currentDigestiveStage: 'mouth_esophagus' | 'stomach' | 'small_intestine' | 'large_intestine' | 'complete';
  digestiveStageLabel: string;
  bolusProgress01: number; // 0..1 along entire GI tract
  gastricEmptyingHours: number;
  smallIntestineHours: number;
  colonicHours: number;
  carbAbsorptionRate: number; // 0..100%
  proteinAbsorptionRate: number; // 0..100%
  lipidAbsorptionRate: number; // 0..100%
  activeEnzymes: string[];

  // Nervous
  restingPotentialMv: number;
  thresholdPotentialMv: number;
  peakPotentialMv: number;
  neuralFiringHz: number;

  // Musculoskeletal
  boneCount: number;
  trabecularBoneDensityIndex: number; // 0.6 to 1.0 by age
  sarcomereLengthUm: number;
  muscleActivations: {
    pectorals: number;
    biceps: number;
    coreAbdominals: number;
    quadriceps: number;
    hamstringsCalves: number;
  };

  // Renal, Endocrine, Immune & Body Composition
  gfrMlMin: number;
  urineOutputLDay: number;
  bladderFillPercent: number;
  bloodGlucoseMgDl: number;
  insulinRelativeLevel: number;
  glucagonRelativeLevel: number;
  coreTempC: number;
  sweatRateMlHr: number;
  bmi: number;
  bmiCategory: string;
  bmrKcalDay: number;
  tdeeKcalDay: number;
  ageProportionScale: {
    heightScale: number;
    headToBodyRatio: number;
    torsoWidthScale: number;
  };
}

/**
 * Validates that every entry in physiology.json conforms to Hard Rule #2.
 */
export function validatePhysiologySchema(
  data: Record<string, PhysiologyFact> = PHYSIOLOGY_DATA,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const validConfidences = new Set(['high', 'approximate', 'illustrative']);

  for (const [key, item] of Object.entries(data)) {
    if (typeof item.value !== 'number' || Number.isNaN(item.value)) {
      errors.push(`${key}: invalid numeric value`);
    }
    if (!item.unit || typeof item.unit !== 'string') {
      errors.push(`${key}: missing unit`);
    }
    if (!Array.isArray(item.range) || item.range.length !== 2 || item.range[0] > item.range[1]) {
      errors.push(`${key}: invalid range tuple`);
    }
    if (!item.source?.title || !item.source?.url || !item.source.url.startsWith('https://')) {
      errors.push(`${key}: missing source title or https URL`);
    }
    if (!validConfidences.has(item.confidence)) {
      errors.push(`${key}: invalid confidence level "${item.confidence}"`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function getBaseHeartRateForAge(ageGroup: Exclude<AgeGroup, 'all'>): number {
  switch (ageGroup) {
    case 'infant':
      return PHYSIOLOGY_DATA.restingHeartRateInfant.value;
    case 'child':
      return PHYSIOLOGY_DATA.restingHeartRateChild.value;
    case 'adolescent':
      return PHYSIOLOGY_DATA.restingHeartRateAdolescent.value;
    case 'older_adult':
      return PHYSIOLOGY_DATA.restingHeartRateOlderAdult.value;
    case 'adult':
    default:
      return PHYSIOLOGY_DATA.restingHeartRateAdult.value;
  }
}

export function computePhysiologyMetrics(params: SimulationParameters): ComputedPhysiologyMetrics {
  const baseHr = getBaseHeartRateForAge(params.ageGroup);
  const activityRatio = Math.max(0, Math.min(1, params.activityLevel / 100));
  const stressRatio = Math.max(0, Math.min(1, params.stressLevel / 100));
  const hydrationRatio = Math.max(0, Math.min(1, params.hydrationLevel / 100));

  // Heart rate responds to activity, sympathetic stress, sleep debt, and dehydration
  const sleepPenaltyBpm = params.sleepHours < 7 ? (7 - params.sleepHours) * 2.5 : 0;
  const dehydrationTachycardia = hydrationRatio < 0.5 ? (0.5 - hydrationRatio) * 18 : 0;
  const computedHr = Math.round(
    baseHr + activityRatio * 95 + stressRatio * 22 + sleepPenaltyBpm + dehydrationTachycardia,
  );
  const heartRateBpm = params.heartRateOverride !== null ? params.heartRateOverride : computedHr;

  // Stroke volume scales with body size, activity (Frank-Starling), and hydration
  const ageScaleSv =
    params.ageGroup === 'infant'
      ? 0.12
      : params.ageGroup === 'child'
        ? 0.45
        : params.ageGroup === 'adolescent'
          ? 0.85
          : params.ageGroup === 'older_adult'
            ? 0.9
            : 1.0;
  const baseSv = PHYSIOLOGY_DATA.strokeVolumeAdult.value * ageScaleSv;
  const strokeVolumeMl = Math.round(
    baseSv * (1 + activityRatio * 0.42) * (0.82 + hydrationRatio * 0.18),
  );

  const cardiacOutputLMin = Number(((heartRateBpm * strokeVolumeMl) / 1000).toFixed(2));

  // Blood Pressure
  const baseSys = PHYSIOLOGY_DATA.systolicBloodPressure.value;
  const baseDia = PHYSIOLOGY_DATA.diastolicBloodPressure.value;
  const ageBpDelta = params.ageGroup === 'older_adult' ? 12 : params.ageGroup === 'infant' ? -35 : params.ageGroup === 'child' ? -18 : 0;
  const systolicBpMmHg =
    params.systolicBpOverride !== null
      ? params.systolicBpOverride
      : Math.round(baseSys + ageBpDelta + activityRatio * 48 + stressRatio * 16);
  const diastolicBpMmHg = Math.round(baseDia + ageBpDelta * 0.4 + activityRatio * 8 + stressRatio * 10);
  const meanArterialPressureMmHg = Math.round(diastolicBpMmHg + (systolicBpMmHg - diastolicBpMmHg) / 3);

  // Blood volume
  const refBv =
    params.sex === 'male'
      ? PHYSIOLOGY_DATA.bloodVolumeMale.value
      : PHYSIOLOGY_DATA.bloodVolumeFemale.value;
  const weightFactor = params.weightKg / 70;
  const bloodVolumeL = Number((refBv * weightFactor * (0.9 + hydrationRatio * 0.1)).toFixed(2));

  // Poiseuille's Law: Q ∝ r^4 (illustrative model for plaque narrowing)
  const stenosisFraction = Math.max(0, Math.min(0.75, params.vesselStenosisPercent / 100));
  const relativeVesselFlow = Number(Math.pow(1 - stenosisFraction, 4).toFixed(3));

  // Respiratory metrics
  const baseRr = PHYSIOLOGY_DATA.respiratoryRateAdult.value * (params.ageGroup === 'infant' ? 2.4 : params.ageGroup === 'child' ? 1.5 : 1.0);
  const respiratoryRateBpm = Math.round(baseRr + activityRatio * 26 + stressRatio * 6);
  const baseTv = PHYSIOLOGY_DATA.tidalVolumeAdult.value * ageScaleSv;
  const tidalVolumeMl = Math.round(baseTv * (1 + activityRatio * 2.2));
  const minuteVentilationLMin = Number(((respiratoryRateBpm * tidalVolumeMl) / 1000).toFixed(1));
  const alveolarPo2MmHg = Math.round(104 - activityRatio * 6);
  const alveolarPco2MmHg = Math.round(40 + activityRatio * 3);

  // Hill Hemoglobin-Oxygen Dissociation Model (anchored to PHYSIOLOGY_DATA.arterialOxygenSaturation)
  const baseSpo2 = PHYSIOLOGY_DATA.arterialOxygenSaturation?.value ?? 98.0;
  const effectivePo2 = Math.max(
    48,
    alveolarPo2MmHg - (1 - relativeVesselFlow) * 32 - activityRatio * 5 - (1 - hydrationRatio) * 3,
  );
  const p50 = 26.6 + activityRatio * 2.4; // Rightward Bohr shift with exercise acidosis/temp
  const hillRatio = Math.pow(effectivePo2, 2.7) / (Math.pow(effectivePo2, 2.7) + Math.pow(p50, 2.7));
  const refHillRatio = Math.pow(104, 2.7) / (Math.pow(104, 2.7) + Math.pow(26.6, 2.7));
  const oxygenSaturationPercent = Number(
    Math.min(100, Math.max(78, baseSpo2 * (hillRatio / refHillRatio))).toFixed(1),
  );

  // Digestive transit times (from physiology.json ranges)
  const mealMultipliers: Record<MealType, { gastric: number; si: number; carbs: number; protein: number; fat: number; enzymes: string[] }> = {
    high_carb: {
      gastric: 0.72,
      si: 0.88,
      carbs: 92,
      protein: 28,
      fat: 18,
      enzymes: ['Salivary α-Amylase', 'Pancreatic Amylase', 'Brush-Border Maltase & Sucrase'],
    },
    high_protein: {
      gastric: 1.12,
      si: 1.05,
      carbs: 35,
      protein: 90,
      fat: 30,
      enzymes: ['Gastric Pepsin + HCl (pH 2.0)', 'Pancreatic Trypsin & Chymotrypsin', 'Aminopeptidases'],
    },
    high_fat: {
      gastric: 1.32,
      si: 1.2,
      carbs: 30,
      protein: 45,
      fat: 94,
      enzymes: ['Hepatic Bile Salts (Emulsification)', 'Pancreatic Lipase + Colipase', 'Lacteal Chylomicron Uptake'],
    },
    balanced: {
      gastric: 1.0,
      si: 1.0,
      carbs: 75,
      protein: 72,
      fat: 68,
      enzymes: ['Salivary Amylase', 'Gastric Pepsin + HCl', 'Hepatic Bile Salts', 'Pancreatic Amylase, Lipase & Trypsin'],
    },
  };

  const mealCfg = mealMultipliers[params.mealType];
  const gastricEmptyingHours = Number((PHYSIOLOGY_DATA.gastricEmptyingTime.value * mealCfg.gastric).toFixed(1));
  const smallIntestineHours = Number((PHYSIOLOGY_DATA.smallIntestineTransitTime.value * mealCfg.si).toFixed(1));
  const colonicHours = PHYSIOLOGY_DATA.colonicTransitTime.value;

  const elapsedHr = params.digestiveElapsedMinutes / 60;
  const mouthEsophagusHr = 0.08; // ~5 mins chewing + 6s esophageal transit
  const stomachEndHr = mouthEsophagusHr + gastricEmptyingHours;
  const siEndHr = stomachEndHr + smallIntestineHours;
  const colonEndHr = siEndHr + colonicHours;

  let currentDigestiveStage: ComputedPhysiologyMetrics['currentDigestiveStage'] = 'mouth_esophagus';
  let digestiveStageLabel = 'Oral Mastication & Esophageal Peristalsis';
  let bolusProgress01 = 0;

  if (elapsedHr <= mouthEsophagusHr) {
    currentDigestiveStage = 'mouth_esophagus';
    digestiveStageLabel = 'Oral Mastication & Esophageal Peristalsis (6s)';
    bolusProgress01 = (elapsedHr / mouthEsophagusHr) * 0.15;
  } else if (elapsedHr <= stomachEndHr) {
    currentDigestiveStage = 'stomach';
    digestiveStageLabel = 'Gastric Acid Churning & Chyme Formation (pH ~2.0)';
    bolusProgress01 = 0.15 + ((elapsedHr - mouthEsophagusHr) / gastricEmptyingHours) * 0.25;
  } else if (elapsedHr <= siEndHr) {
    currentDigestiveStage = 'small_intestine';
    digestiveStageLabel = 'Duodenal Bile/Pancreatic Mixing & Villous Nutrient Absorption';
    bolusProgress01 = 0.4 + ((elapsedHr - stomachEndHr) / smallIntestineHours) * 0.35;
  } else if (elapsedHr <= colonEndHr) {
    currentDigestiveStage = 'large_intestine';
    digestiveStageLabel = 'Colonic Water Reabsorption & Microbiome Fermentation';
    bolusProgress01 = 0.75 + ((elapsedHr - siEndHr) / colonicHours) * 0.25;
  } else {
    currentDigestiveStage = 'complete';
    digestiveStageLabel = 'Digestive Cycle Complete — Rectal Elimination';
    bolusProgress01 = 1.0;
  }

  const siFactor =
    currentDigestiveStage === 'small_intestine'
      ? 1.0
      : currentDigestiveStage === 'stomach'
        ? 0.25
        : currentDigestiveStage === 'large_intestine'
          ? 0.45
          : 0.08;

  // Nervous metrics
  const restingPotentialMv = PHYSIOLOGY_DATA.neuronRestingPotential.value;
  const thresholdPotentialMv = PHYSIOLOGY_DATA.neuronThresholdPotential.value;
  const peakPotentialMv = PHYSIOLOGY_DATA.neuronPeakDepolarization.value;
  const neuralFiringHz = Math.round(12 + activityRatio * 65 + stressRatio * 25);

  // Musculoskeletal metrics
  const boneCount =
    params.ageGroup === 'infant'
      ? PHYSIOLOGY_DATA.infantBoneCount.value
      : PHYSIOLOGY_DATA.adultBoneCount.value;
  const trabecularBoneDensityIndex =
    params.ageGroup === 'older_adult'
      ? 0.74
      : params.ageGroup === 'infant'
        ? 0.68
        : params.ageGroup === 'child'
          ? 0.84
          : 1.0;

  const poseActivations: Record<PoseId, ComputedPhysiologyMetrics['muscleActivations'] & { sarcomere: number }> = {
    anatomical_rest: { pectorals: 10, biceps: 12, coreAbdominals: 18, quadriceps: 15, hamstringsCalves: 16, sarcomere: 2.2 },
    walk_gait: { pectorals: 22, biceps: 25, coreAbdominals: 42, quadriceps: 58, hamstringsCalves: 64, sarcomere: 1.95 },
    run_sprint: { pectorals: 48, biceps: 55, coreAbdominals: 78, quadriceps: 92, hamstringsCalves: 95, sarcomere: 1.72 },
    squat_load: { pectorals: 30, biceps: 28, coreAbdominals: 82, quadriceps: 96, hamstringsCalves: 84, sarcomere: 1.68 },
    bicep_lift: { pectorals: 68, biceps: 94, coreAbdominals: 60, quadriceps: 38, hamstringsCalves: 35, sarcomere: 1.65 },
  };
  const activePoseData = poseActivations[params.activePose];

  // Renal, Endocrine, Immune & Body Composition
  const baseGfr = PHYSIOLOGY_DATA.glomerularFiltrationRate.value;
  const ageGfrFactor = params.ageGroup === 'older_adult' ? 0.78 : params.ageGroup === 'infant' ? 0.45 : 1.0;
  const gfrMlMin = Math.round(baseGfr * ageGfrFactor * (0.7 + hydrationRatio * 0.35) * (1 - activityRatio * 0.22));
  const urineOutputLDay = Number((PHYSIOLOGY_DATA.dailyUrineOutput.value * (0.4 + hydrationRatio * 1.1)).toFixed(2));
  const bladderFillPercent = Math.min(100, Math.round(25 + hydrationRatio * 65));

  // Blood glucose (fasting 90 mg/dL + postprandial curve during stomach/small intestine stages - exercise uptake)
  const postprandialBoost =
    currentDigestiveStage === 'small_intestine'
      ? params.mealType === 'high_carb'
        ? 52
        : 28
      : currentDigestiveStage === 'stomach'
        ? params.mealType === 'high_carb'
          ? 34
          : 16
        : 0;
  const bloodGlucoseMgDl = Math.max(
    68,
    Math.round(PHYSIOLOGY_DATA.fastingBloodGlucose.value + postprandialBoost - activityRatio * 18 + stressRatio * 10),
  );
  const insulinRelativeLevel = Math.min(100, Math.max(10, Math.round((bloodGlucoseMgDl - 65) * 1.15)));
  const glucagonRelativeLevel = Math.min(100, Math.max(10, Math.round(110 - (bloodGlucoseMgDl - 65) * 0.95 + activityRatio * 30)));

  const coreTempC = Number((PHYSIOLOGY_DATA.coreBodyTemperature.value + activityRatio * 1.3 + (1 - hydrationRatio) * 0.3).toFixed(1));
  const sweatRateMlHr = Math.round(45 + activityRatio * 850 + stressRatio * 110);

  // BMI & Energy Balance (Mifflin-St Jeor equation)
  const heightM = params.heightCm / 100;
  const bmi = Number((params.weightKg / (heightM * heightM)).toFixed(1));
  const bmiCategory =
    bmi < 18.5 ? 'Underweight (<18.5)' : bmi < 25 ? 'Normal Weight (18.5–24.9)' : bmi < 30 ? 'Overweight (25.0–29.9)' : 'Obesity (≥30.0)';

  const representativeAgeYears =
    params.ageGroup === 'infant'
      ? 1
      : params.ageGroup === 'child'
        ? 8
        : params.ageGroup === 'adolescent'
          ? 15
          : params.ageGroup === 'older_adult'
            ? 72
            : 30;
  const sexConstant = params.sex === 'male' ? 5 : -161;
  const bmrKcalDay = Math.round(10 * params.weightKg + 6.25 * params.heightCm - 5 * representativeAgeYears + sexConstant);
  const tdeeKcalDay = Math.round(bmrKcalDay * (1.2 + activityRatio * 0.95));

  const ageProportionScale = {
    heightScale:
      params.ageGroup === 'infant'
        ? 0.46
        : params.ageGroup === 'child'
          ? 0.72
          : params.ageGroup === 'adolescent'
            ? 0.92
            : params.ageGroup === 'older_adult'
              ? 0.97
              : 1.0,
    headToBodyRatio:
      params.ageGroup === 'infant'
        ? 1.42
        : params.ageGroup === 'child'
          ? 1.18
          : 1.0,
    torsoWidthScale: 0.85 + (params.bodyFatPercent / 100) * 0.85,
  };

  return {
    heartRateBpm,
    strokeVolumeMl,
    cardiacOutputLMin,
    systolicBpMmHg,
    diastolicBpMmHg,
    meanArterialPressureMmHg,
    bloodVolumeL,
    relativeVesselFlow,
    isStenosisIllustrative: params.vesselStenosisPercent > 0,
    respiratoryRateBpm,
    tidalVolumeMl,
    minuteVentilationLMin,
    alveolarPo2MmHg,
    alveolarPco2MmHg,
    oxygenSaturationPercent,
    currentDigestiveStage,
    digestiveStageLabel,
    bolusProgress01: Number(Math.max(0, Math.min(1, bolusProgress01)).toFixed(3)),
    gastricEmptyingHours,
    smallIntestineHours,
    colonicHours,
    carbAbsorptionRate: Math.round(mealCfg.carbs * siFactor),
    proteinAbsorptionRate: Math.round(mealCfg.protein * siFactor),
    lipidAbsorptionRate: Math.round(mealCfg.fat * siFactor),
    activeEnzymes: mealCfg.enzymes,
    restingPotentialMv,
    thresholdPotentialMv,
    peakPotentialMv,
    neuralFiringHz,
    boneCount,
    trabecularBoneDensityIndex,
    sarcomereLengthUm: activePoseData.sarcomere,
    muscleActivations: {
      pectorals: activePoseData.pectorals,
      biceps: activePoseData.biceps,
      coreAbdominals: activePoseData.coreAbdominals,
      quadriceps: activePoseData.quadriceps,
      hamstringsCalves: activePoseData.hamstringsCalves,
    },
    gfrMlMin,
    urineOutputLDay,
    bladderFillPercent,
    bloodGlucoseMgDl,
    insulinRelativeLevel,
    glucagonRelativeLevel,
    coreTempC,
    sweatRateMlHr,
    bmi,
    bmiCategory,
    bmrKcalDay,
    tdeeKcalDay,
    ageProportionScale,
  };
}

/**
 * Generates synthetic Lead-II ECG voltage (mV) for a normalized cardiac cycle phase [0, 1).
 */
export function sampleEcgWaveform(phase01: number): number {
  const p = ((phase01 % 1) + 1) % 1;
  // P wave (atrial depolarization) around p = 0.16
  const pWave = 0.18 * Math.exp(-Math.pow((p - 0.16) / 0.032, 2));
  // Q dip around p = 0.27
  const qWave = -0.15 * Math.exp(-Math.pow((p - 0.275) / 0.01, 2));
  // R spike (ventricular depolarization) around p = 0.30
  const rWave = 1.15 * Math.exp(-Math.pow((p - 0.30) / 0.012, 2));
  // S dip around p = 0.325
  const sWave = -0.28 * Math.exp(-Math.pow((p - 0.325) / 0.012, 2));
  // T wave (ventricular repolarization) around p = 0.54
  const tWave = 0.32 * Math.exp(-Math.pow((p - 0.54) / 0.048, 2));

  return Number((pWave + qWave + rWave + sWave + tWave).toFixed(4));
}

/**
 * Samples arterial pulse oximetry plethysmograph wave [0, 100] with systolic peak and dicrotic notch.
 */
export function samplePlethWaveform(phase01: number, spo2Percent = 98): number {
  const p = ((phase01 % 1) + 1) % 1;
  // Systolic upstroke peak around p = 0.42 (delayed after R-wave at 0.30)
  const systolicPeak = 68 * Math.exp(-Math.pow((p - 0.42) / 0.085, 2));
  // Dicrotic wave (aortic valve closure rebound) around p = 0.64
  const dicroticWave = 26 * Math.exp(-Math.pow((p - 0.64) / 0.11, 2));
  const ampScale = Math.max(0.4, (spo2Percent - 70) / 30);
  return Number((18 + (systolicPeak + dicroticWave) * ampScale).toFixed(1));
}

export interface DashboardTimePoint {
  timeLabel: string;
  elapsedSec: number;
  ecgMv: number;
  heartRateBpm: number;
  tidalVolumeWaveMl: number;
  respiratoryRateBpm: number;
  spo2Percent: number;
  plethIndex: number;
}

/**
 * Builds a deterministic rolling 6-second telemetry window for the Recharts Simulation Dashboard.
 */
export function buildSimulationDashboardSeries(
  metrics: ComputedPhysiologyMetrics,
  simTimeSec: number,
  sampleCount = 36,
): DashboardTimePoint[] {
  const windowSec = 6.0;
  const startSec = Math.max(0, simTimeSec - windowSec);
  const points: DashboardTimePoint[] = [];
  const hrFreqHz = metrics.heartRateBpm / 60;
  const rrFreqHz = metrics.respiratoryRateBpm / 60;

  for (let i = 0; i < sampleCount; i++) {
    const t = startSec + (i / (sampleCount - 1)) * windowSec;
    const cardiacPhase = (t * hrFreqHz) % 1;
    const respPhase = (t * rrFreqHz) % 1;
    const breathCycle01 = 0.5 - 0.5 * Math.cos(respPhase * Math.PI * 2);

    // Respiratory sinus arrhythmia: slight physiological HR oscillation with inspiration/expiration
    const rsaDelta = Math.sin(respPhase * Math.PI * 2) * 2.2;
    const instHr = Math.round(metrics.heartRateBpm + rsaDelta);
    const instSpo2 = Number(
      Math.min(
        100,
        Math.max(75, metrics.oxygenSaturationPercent + (breathCycle01 - 0.5) * 0.4),
      ).toFixed(1),
    );

    points.push({
      timeLabel: `${t.toFixed(1)}s`,
      elapsedSec: Number(t.toFixed(2)),
      ecgMv: sampleEcgWaveform(cardiacPhase),
      heartRateBpm: instHr,
      tidalVolumeWaveMl: Math.round(breathCycle01 * metrics.tidalVolumeMl),
      respiratoryRateBpm: metrics.respiratoryRateBpm,
      spo2Percent: instSpo2,
      plethIndex: samplePlethWaveform(cardiacPhase, instSpo2),
    });
  }

  return points;
}

/**
 * Samples neuronal membrane voltage (mV) along an action potential cycle phase [0, 1).
 */
export function sampleActionPotentialMv(phase01: number): number {
  const p = ((phase01 % 1) + 1) % 1;
  if (p < 0.15) return -70; // Resting potential
  if (p < 0.25) {
    // Slow stimulus toward threshold (-55 mV)
    const t = (p - 0.15) / 0.1;
    return -70 + t * 15;
  }
  if (p < 0.38) {
    // Rapid Na+ influx depolarization (-55 mV -> +30 mV)
    const t = (p - 0.25) / 0.13;
    return -55 + Math.sin((t * Math.PI) / 2) * 85;
  }
  if (p < 0.62) {
    // K+ efflux repolarization (+30 mV -> -78 mV hyperpolarization)
    const t = (p - 0.38) / 0.24;
    return 30 - t * 108;
  }
  if (p < 0.85) {
    // Na+/K+ ATPase pump recovery (-78 mV -> -70 mV)
    const t = (p - 0.62) / 0.23;
    return -78 + t * 8;
  }
  return -70;
}
