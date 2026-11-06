import physiologyRaw from './physiology.json';

export type ConfidenceLevel = 'high' | 'approximate' | 'illustrative';
export type AgeGroup = 'infant' | 'child' | 'adolescent' | 'adult' | 'older_adult' | 'all';
export type BiologicalSex = 'female' | 'male' | 'all';

export interface PhysiologyFact {
  id: string;
  label: string;
  value: number;
  unit: string;
  range: [number, number];
  ageGroup: AgeGroup;
  sex: BiologicalSex;
  source: {
    title: string;
    url: string;
  };
  confidence: ConfidenceLevel;
}

export const PHYSIOLOGY_DATA: Record<string, PhysiologyFact> =
  physiologyRaw as unknown as Record<string, PhysiologyFact>;

export type LayerId =
  | 'skin'
  | 'fat'
  | 'muscle'
  | 'skeleton'
  | 'organs'
  | 'vessels'
  | 'nerves'
  | 'lymph';

export type SystemId =
  | 'circulatory'
  | 'respiratory'
  | 'digestive'
  | 'nervous'
  | 'musculoskeletal'
  | 'renal_endocrine_immune';

export interface LayerDefinition {
  id: LayerId;
  name: string;
  shortLabel: string;
  defaultVisible: boolean;
  defaultOpacity: number;
  colorSwatch: string;
  description: string;
}

export const ANATOMY_LAYERS: LayerDefinition[] = [
  {
    id: 'skin',
    name: 'Integumentary (Skin)',
    shortLabel: 'Skin',
    defaultVisible: true,
    defaultOpacity: 0.22,
    colorSwatch: '#e2a98b',
    description: 'Epidermal and dermal barrier regulating temperature, sweat evaporation, and tactile sensation.',
  },
  {
    id: 'fat',
    name: 'Subcutaneous Adipose (Fat)',
    shortLabel: 'Fat',
    defaultVisible: false,
    defaultOpacity: 0.35,
    colorSwatch: '#facc15',
    description: 'Adipose energy reservoir and thermal insulation layer scaled dynamically by body fat percentage.',
  },
  {
    id: 'muscle',
    name: 'Skeletal Muscle',
    shortLabel: 'Muscle',
    defaultVisible: true,
    defaultOpacity: 0.42,
    colorSwatch: '#dc2626',
    description: 'Striated contractile fibers attaching across joints via tendons to generate locomotion and posture.',
  },
  {
    id: 'skeleton',
    name: 'Axial & Appendicular Skeleton',
    shortLabel: 'Skeleton',
    defaultVisible: true,
    defaultOpacity: 0.92,
    colorSwatch: '#f1f5f9',
    description: '206 adult cortical and trabecular bone elements providing structural leverage, marrow hematopoiesis, and mineral storage.',
  },
  {
    id: 'organs',
    name: 'Visceral Organs',
    shortLabel: 'Organs',
    defaultVisible: true,
    defaultOpacity: 1.0,
    colorSwatch: '#f43f5e',
    description: 'Thoracic, abdominal, pelvic, and cranial organs executing gas exchange, digestion, filtration, and neural control.',
  },
  {
    id: 'vessels',
    name: 'Arteries & Veins',
    shortLabel: 'Vessels',
    defaultVisible: true,
    defaultOpacity: 0.95,
    colorSwatch: '#3b82f6',
    description: 'Systemic and pulmonary vascular loops carrying oxygenated arterial (red) and deoxygenated venous (blue) blood.',
  },
  {
    id: 'nerves',
    name: 'Central & Peripheral Nerves',
    shortLabel: 'Nerves',
    defaultVisible: true,
    defaultOpacity: 0.9,
    colorSwatch: '#f59e0b',
    description: 'Spinal cord tracts, cranial nerves, and peripheral plexuses conducting electrochemical action potentials.',
  },
  {
    id: 'lymph',
    name: 'Lymphatic Vessels & Nodes',
    shortLabel: 'Lymph',
    defaultVisible: false,
    defaultOpacity: 0.85,
    colorSwatch: '#10b981',
    description: 'Interstitial fluid drainage network, thoracic duct, and secondary lymphoid nodes housing adaptive leukocytes.',
  },
];

export interface AnatomyPart {
  id: string;
  name: string;
  latinName: string;
  layer: LayerId;
  system: SystemId;
  connectedSystems: SystemId[];
  summary: string;
  clinicalNotes: string;
  factIds: string[];
  focusPosition: [number, number, number];
  cameraOffset: [number, number, number];
  microZoomId?: 'heart_chambers' | 'alveoli' | 'villi' | 'neuron_synapse' | 'sarcomere' | 'nephron';
}

export const ANATOMY_PARTS: AnatomyPart[] = [
  {
    id: 'heart',
    name: 'Heart (4-Chamber Myocardium)',
    latinName: 'Cor',
    layer: 'organs',
    system: 'circulatory',
    connectedSystems: ['respiratory', 'nervous', 'renal_endocrine_immune'],
    summary:
      'Four-chambered muscular pump (Right/Left Atria, Right/Left Ventricles) driving pulmonary oxygenation and systemic perfusion through coordinated AV and semilunar valve cycles.',
    clinicalNotes:
      'Sinoatrial (SA) node pacemaker initiates depolarization (P-wave), followed by ventricular systole (QRS complex) and repolarization (T-wave).',
    factIds: ['restingHeartRateAdult', 'strokeVolumeAdult', 'cardiacOutputAdult', 'systolicBloodPressure', 'diastolicBloodPressure'],
    focusPosition: [0.02, 0.36, 0.05],
    cameraOffset: [0.0, 0.42, 0.72],
    microZoomId: 'heart_chambers',
  },
  {
    id: 'aorta_vena_cava',
    name: 'Aorta & Venae Cavae Vascular Tree',
    latinName: 'Aorta et Vena Cava',
    layer: 'vessels',
    system: 'circulatory',
    connectedSystems: ['respiratory', 'digestive', 'renal_endocrine_immune'],
    summary:
      'High-pressure elastic arterial tree distributing oxygenated blood from the left ventricle, paired with low-pressure venous return vessels returning deoxygenated blood to the right atrium.',
    clinicalNotes:
      'According to Poiseuille’s law, vascular resistance scales inversely with the fourth power of vessel radius (r⁴); luminal plaque narrowing dramatically reduces downstream perfusion.',
    factIds: ['systolicBloodPressure', 'diastolicBloodPressure', 'bloodVolumeMale', 'bloodVolumeFemale', 'plaqueFlowReductionFactor'],
    focusPosition: [0.0, 0.25, 0.02],
    cameraOffset: [0.0, 0.3, 0.95],
    microZoomId: 'heart_chambers',
  },
  {
    id: 'lungs',
    name: 'Lungs & Bronchial Tree',
    latinName: 'Pulmones',
    layer: 'organs',
    system: 'respiratory',
    connectedSystems: ['circulatory', 'musculoskeletal'],
    summary:
      'Paired thoracic organs (3 right lobes, 2 left lobes) housing a branching airway tree that terminates in ~480 million alveoli for diffusive O₂ uptake and CO₂ elimination.',
    clinicalNotes:
      'Inflation is driven by negative intrathoracic pressure generated when the dome-shaped diaphragm contracts downward and external intercostals elevate the ribcage.',
    factIds: ['respiratoryRateAdult', 'tidalVolumeAdult', 'alveoliCountAdult'],
    focusPosition: [0.0, 0.38, 0.02],
    cameraOffset: [0.0, 0.42, 0.85],
    microZoomId: 'alveoli',
  },
  {
    id: 'diaphragm',
    name: 'Thoracic Diaphragm & Intercostals',
    latinName: 'Diaphragma',
    layer: 'muscle',
    system: 'respiratory',
    connectedSystems: ['musculoskeletal', 'nervous'],
    summary:
      'Primary dome-shaped skeletal muscle of inspiration separating the thoracic and abdominal cavities, innervated by the phrenic nerve (C3–C5).',
    clinicalNotes:
      'During quiet breathing, diaphragm excursion accounts for ~75% of tidal volume; vigorous exercise recruits accessory inspiratory and abdominal expiratory muscles.',
    factIds: ['respiratoryRateAdult', 'tidalVolumeAdult'],
    focusPosition: [0.0, 0.26, 0.03],
    cameraOffset: [0.0, 0.3, 0.85],
    microZoomId: 'alveoli',
  },
  {
    id: 'stomach',
    name: 'Stomach & Esophagus',
    latinName: 'Gaster et Oesophagus',
    layer: 'organs',
    system: 'digestive',
    connectedSystems: ['circulatory', 'nervous', 'renal_endocrine_immune'],
    summary:
      'Muscular J-shaped sac receiving food boluses via esophageal peristalsis, performing mechanical churning and chemical proteolysis via hydrochloric acid (pH ~2.0) and pepsin.',
    clinicalNotes:
      'Carbohydrate-rich meals empty fastest (~2 hrs), whereas high-protein and high-lipid meals slow pyloric emptying (~3–4+ hrs) via cholecystokinin (CCK) feedback.',
    factIds: ['esophagealTransitTime', 'gastricEmptyingTime', 'gastricAcidPh'],
    focusPosition: [0.06, 0.16, 0.05],
    cameraOffset: [0.08, 0.2, 0.8],
    microZoomId: 'villi',
  },
  {
    id: 'liver_pancreas',
    name: 'Liver, Gallbladder & Pancreas',
    latinName: 'Hepar, Vesica Biliaris et Pancreas',
    layer: 'organs',
    system: 'digestive',
    connectedSystems: ['circulatory', 'renal_endocrine_immune'],
    summary:
      'Accessory metabolic triad: hepatocytes synthesize bile salts stored in the gallbladder to emulsify dietary lipids, while the exocrine pancreas secretes bicarbonate, amylase, lipase, and proteases.',
    clinicalNotes:
      'Nutrient-rich venous blood from the GI tract drains directly into the hepatic portal vein for first-pass glycogen storage and detoxification.',
    factIds: ['gastricEmptyingTime', 'smallIntestineTransitTime', 'fastingBloodGlucose'],
    focusPosition: [-0.05, 0.18, 0.05],
    cameraOffset: [-0.05, 0.22, 0.82],
    microZoomId: 'villi',
  },
  {
    id: 'intestines',
    name: 'Small & Large Intestines',
    latinName: 'Intestinum Tenue et Crassum',
    layer: 'organs',
    system: 'digestive',
    connectedSystems: ['circulatory', 'lymph', 'renal_endocrine_immune'] as unknown as SystemId[],
    summary:
      'Duodenum, jejunum, and ileum amplify absorptive surface area via circular folds, villi, and microvilli; the colon reabsorbs water and electrolytes before rectal elimination.',
    clinicalNotes:
      'Monosaccharides and amino acids enter villous capillary beds toward the portal vein, whereas chylomicrons (lipids) enter central lacteals of the lymphatic system.',
    factIds: ['smallIntestineTransitTime', 'colonicTransitTime'],
    focusPosition: [0.0, 0.02, 0.05],
    cameraOffset: [0.0, 0.05, 0.85],
    microZoomId: 'villi',
  },
  {
    id: 'brain',
    name: 'Brain (Cerebral Lobes, Cerebellum & Hippocampus)',
    latinName: 'Encephalon',
    layer: 'organs',
    system: 'nervous',
    connectedSystems: ['circulatory', 'musculoskeletal', 'renal_endocrine_immune'],
    summary:
      'Central command center comprising Frontal (executive/motor), Parietal (somatosensory), Temporal (auditory/hippocampal memory), and Occipital (visual) lobes, plus Cerebellar coordination and Brainstem autonomic nuclei.',
    clinicalNotes:
      'Consumes ~20% of resting body oxygen despite representing ~2% of body mass; neurons communicate via all-or-none voltage-gated Na⁺/K⁺ action potentials and chemical synapses.',
    factIds: ['neuronRestingPotential', 'neuronThresholdPotential', 'neuronPeakDepolarization'],
    focusPosition: [0.0, 0.74, 0.0],
    cameraOffset: [0.0, 0.76, 0.62],
    microZoomId: 'neuron_synapse',
  },
  {
    id: 'spinal_cord_nerves',
    name: 'Spinal Cord & Patellar Reflex Arc',
    latinName: 'Medulla Spinalis et Nervi',
    layer: 'nerves',
    system: 'nervous',
    connectedSystems: ['musculoskeletal', 'circulatory'],
    summary:
      'Dorsal sensory and ventral motor roots mediating rapid spinal reflexes (such as the L2–L4 monosynaptic knee-jerk reflex) and bidirectional brain–body signaling.',
    clinicalNotes:
      'Tapping the patellar tendon stretches quadriceps muscle spindles, firing Ia afferent fibers into the spinal cord to excite alpha motor neurons within ~21 ms before conscious cortical awareness.',
    factIds: ['patellarReflexLatency', 'neuronRestingPotential', 'neuronPeakDepolarization'],
    focusPosition: [0.0, 0.35, -0.04],
    cameraOffset: [0.25, 0.35, 0.95],
    microZoomId: 'neuron_synapse',
  },
  {
    id: 'skeleton_axial',
    name: 'Cranium, Vertebral Column & Thoracic Cage',
    latinName: 'Skeleton Axiale',
    layer: 'skeleton',
    system: 'musculoskeletal',
    connectedSystems: ['nervous', 'respiratory', 'circulatory'],
    summary:
      '80 axial bones protecting the brain, spinal cord, heart, and lungs while providing attachment surfaces for postural and respiratory musculature.',
    clinicalNotes:
      'Bone constantly remodels via osteoblast deposition and osteoclast resorption along mechanical stress lines (Wolff’s Law).',
    factIds: ['adultBoneCount', 'infantBoneCount'],
    focusPosition: [0.0, 0.4, 0.0],
    cameraOffset: [0.0, 0.42, 1.05],
    microZoomId: 'sarcomere',
  },
  {
    id: 'femur_knee_joint',
    name: 'Femur, Patella & Appendicular Joints',
    latinName: 'Os Femoris et Articulatio Genus',
    layer: 'skeleton',
    system: 'musculoskeletal',
    connectedSystems: ['nervous', 'circulatory'],
    summary:
      '126 appendicular bones joined by synovial ball-and-socket (hip, shoulder), hinge (knee, elbow), and pivot joints. Dense cortical bone surrounds honeycombed trabecular marrow.',
    clinicalNotes:
      'Fracture healing progresses through 4 stages: hematoma formation (days 1–5), fibrocartilaginous callus (weeks 1–3), bony callus ossification (weeks 4–12), and cortical remodeling (months).',
    factIds: ['adultBoneCount', 'infantBoneCount', 'sarcomereRestingLength'],
    focusPosition: [0.1, -0.35, 0.02],
    cameraOffset: [0.15, -0.3, 0.95],
    microZoomId: 'sarcomere',
  },
  {
    id: 'skeletal_muscles',
    name: 'Appendicular Skeletal Muscles (Quadriceps, Biceps, Pectorals)',
    latinName: 'Musculi Skeleti',
    layer: 'muscle',
    system: 'musculoskeletal',
    connectedSystems: ['nervous', 'circulatory'],
    summary:
      'Antagonistic muscle pairs spanning synovial joints from proximal origin to distal insertion; contraction occurs via Ca²⁺-triggered actin–myosin cross-bridge cycling within sarcomeres.',
    clinicalNotes:
      'Concentric contraction shortens sarcomeres (~2.2 µm → 1.6 µm) as myosin heads pull thin actin filaments toward the M-line using ATP hydrolysis.',
    factIds: ['sarcomereRestingLength', 'adultBoneCount'],
    focusPosition: [0.12, 0.15, 0.05],
    cameraOffset: [0.15, 0.18, 1.05],
    microZoomId: 'sarcomere',
  },
  {
    id: 'kidneys_bladder',
    name: 'Kidneys, Ureters & Urinary Bladder',
    latinName: 'Renes et Vesica Urinaria',
    layer: 'organs',
    system: 'renal_endocrine_immune',
    connectedSystems: ['circulatory', 'nervous'],
    summary:
      'Retroperitoneal bean-shaped organs (~1 million nephrons each) filtering ~180 L of plasma daily via glomerular filtration, tubular reabsorption, and secretion to maintain fluid and electrolyte homeostasis.',
    clinicalNotes:
      'Antidiuretic hormone (ADH/vasopressin) and aldosterone tightly regulate collecting duct water aquaporin channels in response to systemic hydration and osmolarity.',
    factIds: ['glomerularFiltrationRate', 'dailyUrineOutput'],
    focusPosition: [0.0, 0.1, -0.03],
    cameraOffset: [0.0, 0.12, 0.82],
    microZoomId: 'nephron',
  },
  {
    id: 'lymph_immune_network',
    name: 'Lymphatic Vessels, Nodes & Spleen',
    latinName: 'Systema Lymphaticum',
    layer: 'lymph',
    system: 'renal_endocrine_immune',
    connectedSystems: ['circulatory', 'digestive'],
    summary:
      'One-way interstitial fluid return network passing through cervical, axillary, and inguinal lymph nodes where macrophages, B-lymphocytes, and T-lymphocytes neutralize pathogens.',
    clinicalNotes:
      'Hygiene behaviors (20-second soap handwashing, dental biofilm removal, adequate sleep) substantially lower pathogen entry load and systemic inflammatory stress.',
    factIds: ['handwashingDurationCDC', 'adultSleepDurationCDC', 'coreBodyTemperature'],
    focusPosition: [-0.08, 0.28, 0.02],
    cameraOffset: [-0.1, 0.3, 0.9],
    microZoomId: 'nephron',
  },
  {
    id: 'skin_integument',
    name: 'Cutaneous Integument & Eccrine Sweat Glands',
    latinName: 'Cutis (Epidermis, Dermis, Hypodermis)',
    layer: 'skin',
    system: 'renal_endocrine_immune',
    connectedSystems: ['nervous', 'circulatory'],
    summary:
      'Stratified squamous keratinized epidermis, vascularized dermis with eccrine sweat glands and mechanoreceptors, and subcutaneous hypodermis.',
    clinicalNotes:
      'Hypothalamic thermoregulation dilates dermal arterioles and activates eccrine sweat glands when core temperature rises above 37.0°C.',
    factIds: ['coreBodyTemperature', 'handwashingDurationCDC'],
    focusPosition: [0.0, 0.2, 0.14],
    cameraOffset: [0.0, 0.22, 1.2],
    microZoomId: 'nephron',
  },
];

export interface SystemMetadata {
  id: SystemId;
  name: string;
  shortName: string;
  tagline: string;
  modelLimits: string[];
  defaultPartId: string;
}

export const SYSTEMS_METADATA: Record<SystemId, SystemMetadata> = {
  circulatory: {
    id: 'circulatory',
    name: 'Circulatory & Cardiovascular System',
    shortName: 'Circulatory',
    tagline: '4-chamber cardiac cycle, ECG waveform synchronization, and systemic/pulmonary hemodynamics.',
    defaultPartId: 'heart',
    modelLimits: [
      'Simplified lumped-parameter hemodynamic model: ignores pulsatile wave reflections, non-Newtonian blood viscosity (Fahraeus–Lindqvist effect) in microvessels, and local metabolic autoregulation.',
      'Plaque stenosis "What-if" uses an idealized steady-flow Poiseuille r⁴ scaling and is marked illustrative; real coronary or carotid plaques exhibit turbulent post-stenotic eddies and collateral vessel recruitment.',
      'ECG waveform is a clean synthetic Lead-II educational synthesis and does not model arrhythmias, bundle branch blocks, or patient-specific cardiac axis rotation.',
    ],
  },
  respiratory: {
    id: 'respiratory',
    name: 'Respiratory & Pulmonary Gas Exchange',
    shortName: 'Respiratory',
    tagline: 'Diaphragmatic mechanics, bronchial tree ventilation, and alveolar-capillary O₂/CO₂ diffusion.',
    defaultPartId: 'lungs',
    modelLimits: [
      'Models uniform ventilation-perfusion (V/Q) matching across both lungs; omits West’s gravitational pulmonary zones (Zone 1–3) and anatomical dead-space mixing gradients.',
      'Hemoglobin-oxygen dissociation assumes standard sea-level barometric pressure (760 mmHg) without dynamic 2,3-BPG or Bohr-shift pH feedback loops.',
    ],
  },
  digestive: {
    id: 'digestive',
    name: 'Digestive & Hepatobiliary System',
    shortName: 'Digestive',
    tagline: 'Peristaltic bolus transport (0.1x–1000x speed), enzymatic breakdown, and small-intestinal villi absorption.',
    defaultPartId: 'stomach',
    modelLimits: [
      'Represents gastric emptying and intestinal transit as continuous deterministic curves scaled by macronutrient composition; omits migrating motor complexes (MMCs), gut microbiome fermentation variability, and individual hormonal meal size non-linearities.',
      'Enzymatic activity is shown as normalized relative rates rather than Michaelis–Menten substrate saturation kinetics.',
    ],
  },
  nervous: {
    id: 'nervous',
    name: 'Nervous System & Brain',
    shortName: 'Nervous',
    tagline: 'Cerebral lobe functional mapping, Hodgkin–Huxley action potential propagation, and spinal reflex arcs.',
    defaultPartId: 'brain',
    modelLimits: [
      'Action potential zoom depicts a single canonical mammalian myelinated axon trace (-70 mV to +30 mV); omits diverse cortical interneuron firing patterns, dendritic cable attenuation, and glial astrocyte buffering.',
      'Brain region mapping highlights primary textbook functional areas; real human cognition relies on distributed whole-brain networks (Default Mode, Salience, Frontoparietal).',
    ],
  },
  musculoskeletal: {
    id: 'musculoskeletal',
    name: 'Musculoskeletal System & Biomechanics',
    shortName: 'Musculoskeletal',
    tagline: 'Skeletal joint kinematics, muscle origin/insertion activation across poses, and sarcomere sliding filaments.',
    defaultPartId: 'skeletal_muscles',
    modelLimits: [
      'Muscle activation percentages during Walk, Run, Squat, and Lift are simplified normalized EMG envelopes (illustrative); omits multi-joint tendon elasticity, pennation angle changes, and motor-unit recruitment fatigue.',
      'Bone density and fracture healing timelines represent healthy non-smoking adult averages without metabolic bone disease variables.',
    ],
  },
  renal_endocrine_immune: {
    id: 'renal_endocrine_immune',
    name: 'Renal, Endocrine, Immune & Integumentary',
    shortName: 'Renal · Endo · Immune',
    tagline: 'Nephron filtration & hydration, insulin–glucagon glucose loop, leukocyte defense, and cutaneous thermoregulation.',
    defaultPartId: 'kidneys_bladder',
    modelLimits: [
      'Nephron filtration (GFR) and urine output use steady-state tubuloglomerular balance approximations; omits countercurrent multiplier osmotic gradients in the renal medulla.',
      'Insulin–glucagon glucose curve is a simplified two-compartment feedback loop and must never be used for insulin dosing or diabetes management.',
      'Immune pathogen-leukocyte visualization is a conceptual cellular schematic omitting MHC antigen presentation and clonal selection latency.',
    ],
  },
};
