import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validatePhysiologySchema,
  computePhysiologyMetrics,
  sampleEcgWaveform,
  sampleActionPotentialMv,
  buildSimulationDashboardSeries,
  SimulationParameters,
} from './physiologyMath';
import { PHYSIOLOGY_DATA } from '../data/anatomyCatalog';

const defaultParams: SimulationParameters = {
  ageGroup: 'adult',
  sex: 'female',
  weightKg: 68,
  heightCm: 168,
  bodyFatPercent: 22,
  activityLevel: 15,
  hydrationLevel: 75,
  sleepHours: 8,
  stressLevel: 15,
  heartRateOverride: null,
  systolicBpOverride: null,
  vesselStenosisPercent: 0,
  mealType: 'balanced',
  digestiveElapsedMinutes: 90,
  activePose: 'anatomical_rest',
  reflexTriggerTime: null,
  circadianHour: 10,
  handwashingPracticed: true,
};

test('physiology.json schema validation passes all Hard Rule #2 checks', () => {
  const result = validatePhysiologySchema(PHYSIOLOGY_DATA);
  assert.equal(result.valid, true, `Schema validation failed: ${result.errors.join(', ')}`);
  assert.ok(Object.keys(PHYSIOLOGY_DATA).length >= 20);
});

test('resting vs exercise hemodynamics and respiratory scaling', () => {
  const rest = computePhysiologyMetrics({ ...defaultParams, activityLevel: 0, stressLevel: 0 });
  const exercise = computePhysiologyMetrics({ ...defaultParams, activityLevel: 85, stressLevel: 30 });

  assert.ok(rest.heartRateBpm >= 60 && rest.heartRateBpm <= 80);
  assert.ok(exercise.heartRateBpm > rest.heartRateBpm + 60);
  assert.ok(exercise.cardiacOutputLMin > rest.cardiacOutputLMin * 2);
  assert.ok(exercise.minuteVentilationLMin > rest.minuteVentilationLMin * 3);
  assert.ok(rest.oxygenSaturationPercent >= 95 && rest.oxygenSaturationPercent <= 100);
});

test('Poiseuille plaque narrowing reduces relative vessel flow and marks illustrative', () => {
  const normal = computePhysiologyMetrics({ ...defaultParams, vesselStenosisPercent: 0 });
  const narrowed = computePhysiologyMetrics({ ...defaultParams, vesselStenosisPercent: 35 });

  assert.equal(normal.relativeVesselFlow, 1);
  assert.equal(normal.isStenosisIllustrative, false);
  assert.ok(narrowed.relativeVesselFlow < 0.25);
  assert.equal(narrowed.isStenosisIllustrative, true);
  assert.ok(narrowed.oxygenSaturationPercent < normal.oxygenSaturationPercent);
});

test('digestive timeline advances through stages from mouth to colon', () => {
  const mouthStage = computePhysiologyMetrics({ ...defaultParams, digestiveElapsedMinutes: 2 });
  const stomachStage = computePhysiologyMetrics({ ...defaultParams, digestiveElapsedMinutes: 60 });
  const siStage = computePhysiologyMetrics({ ...defaultParams, digestiveElapsedMinutes: 270 });
  const colonStage = computePhysiologyMetrics({ ...defaultParams, digestiveElapsedMinutes: 600 });

  assert.equal(mouthStage.currentDigestiveStage, 'mouth_esophagus');
  assert.equal(stomachStage.currentDigestiveStage, 'stomach');
  assert.equal(siStage.currentDigestiveStage, 'small_intestine');
  assert.equal(colonStage.currentDigestiveStage, 'large_intestine');
  assert.ok(siStage.bolusProgress01 > stomachStage.bolusProgress01);
});

test('life stages update bone count, heart rate, and body proportions', () => {
  const infant = computePhysiologyMetrics({ ...defaultParams, ageGroup: 'infant' });
  const adult = computePhysiologyMetrics({ ...defaultParams, ageGroup: 'adult' });
  const older = computePhysiologyMetrics({ ...defaultParams, ageGroup: 'older_adult' });

  assert.equal(infant.boneCount, 270);
  assert.equal(adult.boneCount, 206);
  assert.ok(infant.heartRateBpm > adult.heartRateBpm);
  assert.ok(older.trabecularBoneDensityIndex < adult.trabecularBoneDensityIndex);
});

test('ECG and Action Potential waveform samplers return bounded physiological voltages', () => {
  const rPeak = sampleEcgWaveform(0.3);
  const baseline = sampleEcgWaveform(0.05);
  assert.ok(rPeak > 0.9);
  assert.ok(Math.abs(baseline) < 0.05);

  const restingMv = sampleActionPotentialMv(0.05);
  const peakMv = sampleActionPotentialMv(0.38);
  assert.equal(restingMv, -70);
  assert.ok(peakMv >= 28 && peakMv <= 31);
});

test('buildSimulationDashboardSeries returns bounded Recharts telemetry points for heartbeat, respiration, and SpO2', () => {
  const metrics = computePhysiologyMetrics(defaultParams);
  const series = buildSimulationDashboardSeries(metrics, 12.0, 24);
  assert.equal(series.length, 24);
  for (const pt of series) {
    assert.ok(pt.heartRateBpm >= 50 && pt.heartRateBpm <= 210);
    assert.ok(pt.respiratoryRateBpm >= 8 && pt.respiratoryRateBpm <= 60);
    assert.ok(pt.spo2Percent >= 75 && pt.spo2Percent <= 100);
    assert.ok(pt.tidalVolumeWaveMl >= 0 && pt.tidalVolumeWaveMl <= metrics.tidalVolumeMl);
  }
});
