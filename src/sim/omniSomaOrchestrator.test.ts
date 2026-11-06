import test from 'node:test';
import assert from 'node:assert/strict';
import { ANATOMY_PARTS } from '../data/anatomyCatalog';
import {
  PART_TO_AGENTS_MAP,
  runOmniSomaOrchestrationTick,
  SPECIALIST_AGENTS_REGISTRY,
} from './omniSomaOrchestrator';
import { SimulationParameters } from './physiologyMath';

const baseParams: SimulationParameters = {
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
};

test('all 10 specialist agents exist and every anatomical part has an assigned agent', () => {
  assert.equal(SPECIALIST_AGENTS_REGISTRY.length, 10);
  for (const part of ANATOMY_PARTS) {
    const assignment = PART_TO_AGENTS_MAP[part.id];
    assert.ok(assignment, `Missing specialist agent assignment for anatomical part: ${part.id}`);
    assert.ok(assignment.primary, `Missing primary agent for ${part.id}`);
    assert.ok(assignment.secondary.length >= 1, `Missing collaborating agents for ${part.id}`);
  }
});

test('OmniSoma orchestrator executes 1.0s physiological tick and populates Blackboard Data Bus', () => {
  const bus = runOmniSomaOrchestrationTick(
    baseParams,
    {
      ambientTempC: 22,
      physicalWorkload: 15,
      traumaLevel: 0,
      nourishmentLevel: 80,
    },
    0,
    1.0,
  );

  assert.equal(bus.tickCount, 1);
  assert.equal(bus.dtSeconds, 1.0);
  assert.equal(Object.keys(bus.agents).length, 10);
  assert.ok(bus.homeostasisScore >= 85);
  assert.ok(bus.controlVectors.length >= 2);
});

test('high physical workload and acute trauma trigger cross-system discrepancies and corrective vectors', () => {
  const stressedBus = runOmniSomaOrchestrationTick(
    { ...baseParams, hydrationLevel: 30 },
    {
      ambientTempC: 34,
      physicalWorkload: 85,
      traumaLevel: 45,
      nourishmentLevel: 30,
    },
    5,
    1.0,
  );

  assert.equal(stressedBus.tickCount, 6);
  // Expect discrepancies from muscular oxygen debt, renal hyperosmolarity, trauma inflammation, thermal load, and glycogen depletion
  assert.ok(stressedBus.discrepancies.length >= 4);
  assert.ok(
    stressedBus.controlVectors.some(
      (v) =>
        v.sourceAgent === 'muscular_biomechanics' &&
        v.targetAgent === 'cardiovascular_hemodynamics',
    ),
  );
  assert.ok(
    stressedBus.controlVectors.some(
      (v) => v.sourceAgent === 'immune_cellular' && v.targetAgent === 'endocrine_humoral',
    ),
  );
  assert.ok(stressedBus.homeostasisScore < 75);
});
