import { SystemId } from './anatomyCatalog';
import { SimulationParameters } from '../sim/physiologyMath';

export interface QuizQuestion {
  id: string;
  system: SystemId;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  sourceRef: string;
}

export const SYSTEM_QUIZZES: QuizQuestion[] = [
  {
    id: 'q_circ_1',
    system: 'circulatory',
    question: 'Which cardiac event corresponds directly to the QRS complex on a standard Lead-II ECG trace?',
    options: [
      'Atrial depolarization initiated by the SA node',
      'Ventricular depolarization triggering ventricular systole',
      'Ventricular repolarization during diastole',
      'Closure of the aortic and pulmonary semilunar valves',
    ],
    correctIndex: 1,
    explanation:
      'The QRS complex represents rapid ventricular depolarization via the Bundle of His and Purkinje fibers immediately preceding ventricular contraction.',
    sourceRef: 'OpenStax Anatomy & Physiology 2e — §19.4 Cardiac Physiology',
  },
  {
    id: 'q_resp_1',
    system: 'respiratory',
    question: 'How does contraction of the thoracic diaphragm drive normal quiet inspiration?',
    options: [
      'It elevates intrathoracic pressure above atmospheric pressure',
      'It flattens downward, increasing thoracic volume and lowering intrapulmonary pressure',
      'It constricts the bronchioles to accelerate airflow velocity',
      'It actively pumps oxygen across the alveolar membrane via ATPase',
    ],
    correctIndex: 1,
    explanation:
      'By Boyle’s Law, downward contraction of the diaphragm expands thoracic volume, dropping alveolar pressure ~1–2 mmHg below atmospheric pressure so air flows inward.',
    sourceRef: 'OpenStax Anatomy & Physiology 2e — §22.3 The Process of Breathing',
  },
  {
    id: 'q_dig_1',
    system: 'digestive',
    question: 'Why does a lipid-rich meal remain in the stomach longer than a simple carbohydrate meal?',
    options: [
      'Lipids neutralize gastric hydrochloric acid to pH 7.0',
      'Duodenal cholecystokinin (CCK) and secretin slow pyloric emptying to allow bile emulsification',
      'Salivary amylase inhibits esophageal peristalsis in the presence of fat',
      'The stomach absorbs 90% of dietary triglycerides directly into the portal vein',
    ],
    correctIndex: 1,
    explanation:
      'Fat chyme entering the duodenum stimulates CCK release, which relaxes the stomach and slows pyloric emptying (3–4+ hrs) while triggering gallbladder contraction.',
    sourceRef: 'OpenStax Anatomy & Physiology 2e — §23.4 The Stomach',
  },
  {
    id: 'q_nerv_1',
    system: 'nervous',
    question: 'What ion movement causes the rapid rising phase (-55 mV to +30 mV) of a neuronal action potential?',
    options: [
      'Efflux of intracellular K⁺ through leak channels',
      'Influx of extracellular Na⁺ through voltage-gated Na⁺ channels',
      'Influx of Cl⁻ ions via GABAergic receptors',
      'Active pumping of 3 Na⁺ inward by the Na⁺/K⁺-ATPase',
    ],
    correctIndex: 1,
    explanation:
      'Once membrane potential crosses the -55 mV threshold, voltage-gated Na⁺ channels open rapidly, allowing Na⁺ to rush down its electrochemical gradient toward +30 mV.',
    sourceRef: 'OpenStax Anatomy & Physiology 2e — §12.5 Communication Between Neurons',
  },
  {
    id: 'q_msk_1',
    system: 'musculoskeletal',
    question: 'According to the sliding filament model of skeletal muscle contraction, what happens to the sarcomere during concentric shortening?',
    options: [
      'Individual actin and myosin filaments shrink in molecular length',
      'Myosin heads pull thin actin filaments toward the M-line, narrowing the I-band and H-zone while the A-band stays constant',
      'Z-discs dissolve and reform after relaxation',
      'Tropomyosin binds directly to ATP to shorten the Z-disc distance',
    ],
    correctIndex: 1,
    explanation:
      'Myofilaments themselves do not change length; rather, thick myosin and thin actin filaments slide past one another, increasing zone of overlap and pulling Z-discs closer (~2.2 µm → 1.65 µm).',
    sourceRef: 'OpenStax Anatomy & Physiology 2e — §10.3 Muscle Fiber Contraction and Relaxation',
  },
  {
    id: 'q_rei_1',
    system: 'renal_endocrine_immune',
    question: 'In a healthy adult nephron, approximately what Glomerular Filtration Rate (GFR) is maintained, and how much becomes daily urine?',
    options: [
      '120 mL/min (~170–180 L/day filtrate), with ~99% reabsorbed leaving ~1.5 L/day urine',
      '1.5 mL/min, with 0% tubular reabsorption',
      '500 mL/min, with 50% excreted as sweat',
      '15 mL/min, regulated exclusively by glucagon',
    ],
    correctIndex: 0,
    explanation:
      'Both kidneys filter ~120 mL/min (~173 L/day) of plasma; the proximal tubule, Loop of Henle, and collecting ducts reabsorb ~99% of water and solutes, yielding ~1.5 L/day of urine.',
    sourceRef: 'OpenStax Anatomy & Physiology 2e — §25.5 Physiology of Urine Formation',
  },
];

export interface DayTimelineEvent {
  hour: number;
  timeLabel: string;
  title: string;
  description: string;
  overrides: Partial<SimulationParameters>;
}

export const DAY_IN_THE_BODY_EVENTS: DayTimelineEvent[] = [
  {
    hour: 7,
    timeLabel: '07:00 AM',
    title: 'Morning Awakening & Cortisol Rise',
    description: 'Fasting state (blood glucose ~88 mg/dL), resting heart rate (~66 bpm), bladder full from overnight renal concentration.',
    overrides: {
      activityLevel: 10,
      stressLevel: 15,
      hydrationLevel: 55,
      mealType: 'balanced',
      digestiveElapsedMinutes: 720,
      activePose: 'anatomical_rest',
      circadianHour: 7,
    },
  },
  {
    hour: 8,
    timeLabel: '08:30 AM',
    title: 'Carbohydrate-Rich Breakfast & Gastric Churning',
    description: 'Oatmeal & fruit bolus enters stomach; salivary and pancreatic amylase elevate postprandial glucose (~126 mg/dL) and insulin release.',
    overrides: {
      activityLevel: 18,
      stressLevel: 15,
      hydrationLevel: 78,
      mealType: 'high_carb',
      digestiveElapsedMinutes: 75,
      activePose: 'anatomical_rest',
      circadianHour: 8.5,
    },
  },
  {
    hour: 12,
    timeLabel: '12:30 PM',
    title: 'Midday Cognitive Focus & Balanced Lunch',
    description: 'High prefrontal & hippocampal neural firing; small intestine villi actively absorbing amino acids and monosaccharides.',
    overrides: {
      activityLevel: 22,
      stressLevel: 35,
      hydrationLevel: 82,
      mealType: 'balanced',
      digestiveElapsedMinutes: 195,
      activePose: 'walk_gait',
      circadianHour: 12.5,
    },
  },
  {
    hour: 17,
    timeLabel: '05:30 PM',
    title: 'High-Intensity Aerobic Run & Thermoregulation',
    description: 'Cardiac output surges >14 L/min, minute ventilation triples, sarcomeres cycle rapidly, and eccrine sweat glands cool the skin.',
    overrides: {
      activityLevel: 82,
      stressLevel: 40,
      hydrationLevel: 60,
      mealType: 'balanced',
      digestiveElapsedMinutes: 340,
      activePose: 'run_sprint',
      circadianHour: 17.5,
    },
  },
  {
    hour: 20,
    timeLabel: '08:00 PM',
    title: 'High-Protein Recovery Dinner & Parasympathetic Shift',
    description: 'Pepsin and pancreatic proteases digest dietary protein for myofibrillar repair; rehydration restores GFR and fluid balance.',
    overrides: {
      activityLevel: 12,
      stressLevel: 10,
      hydrationLevel: 88,
      mealType: 'high_protein',
      digestiveElapsedMinutes: 95,
      activePose: 'anatomical_rest',
      circadianHour: 20,
    },
  },
  {
    hour: 23,
    timeLabel: '11:30 PM',
    title: 'Deep Slow-Wave Sleep & Glymphatic Clearance',
    description: 'Heart rate drops to ~58 bpm, respiratory rate slows to 12 breaths/min, colonic water absorption continues, and neural synapses consolidate memory.',
    overrides: {
      activityLevel: 0,
      stressLevel: 0,
      hydrationLevel: 75,
      mealType: 'high_protein',
      digestiveElapsedMinutes: 310,
      activePose: 'anatomical_rest',
      circadianHour: 23.5,
    },
  },
];
