# 3D Anatomy Model Sourcing Plan & Asset Registry (`ASSETS.md`)

This document defines the 3D anatomical asset sourcing strategy, quality and accuracy evaluation criteria, license verification workflow (in strict compliance with **Hard Rule #5**), and the active asset registry for **SomaLab**.

---

## 1. Marketplaces, Open Repositories & Search Strategy

When sourcing 3D human anatomy models, search sources in the following priority order (prioritizing open scientific repositories before commercial marketplaces):

| Source / Platform | URL | Typical Licenses | Primary Use Case in SomaLab |
| :--- | :--- | :--- | :--- |
| **Z-Anatomy Open Atlas** | `https://www.z-anatomy.com/` | CC BY-SA 4.0 | Complete layered human anatomy derived from BodyParts3D and refined by anatomists in Blender. |
| **BodyParts3D / Anatomography (DBCLS)** | `https://lifesciencedb.jp/bp3d/` | CC BY-SA 2.1 JP | Indexed anatomical segments mapped to FMA/TA2 (Terminologia Anatomica 2) ontology IDs. |
| **NIH 3D / Human Reference Atlas** | `https://3d.nih.gov/` | Public Domain (CC0) / CC BY 4.0 | Clinical-grade organs, vascular trees, and Visible Human reference models validated by NIH/NLM. |
| **Sketchfab (Cultural Heritage & Science)** | `https://sketchfab.com/` | CC0, CC BY 4.0, Sketchfab Standard | University anatomy museum scans (e.g., University of Dundee, WitmerLab) with downloadable GLTF/GLB. |
| **CGTrader** | `https://www.cgtrader.com/` | Royalty-Free (RF) / Editorial | Low/mid-poly optimized PBR organ and skeletal packs when open-license equivalents need retopology. |
| **TurboSquid** | `https://www.turbosquid.com/` | TurboSquid Royalty-Free / StemCell | Standardized StemCell GLTF/PBR medical topology; avoid "Editorial Only" items. |

---

## 2. Evaluation Criteria: Model Quality & Anatomical Accuracy

Every candidate 3D asset is evaluated against two gates before integration:

### A. Anatomical & Clinical Accuracy Gate
1. **Topological Proportions & Landmarks**: Skeletal and visceral proportions must align with standard adult anatomical references (*OpenStax Anatomy & Physiology 2e* / *Terminologia Anatomica 2*). Key landmarks (e.g., 4 cardiac chambers with coronary vessels & valves, 3 right / 2 left pulmonary lobes, 335 skeletal bones/cartilages, 1,110 muscles/tendons/fasciae) must be distinct and selectable.
2. **Coordinate Registration**: All 8 layers (`Skin`, `Fat`, `Muscle`, `Skeleton`, `Organs`, `Vessels`, `Nerves`, `Lymph`) share a unified metric coordinate system (`1 unit = 1 meter`, feet at `y = 0.0 m`, crown at `y = 1.70 m`) so layers never intersect erroneously when toggled or sliced.
3. **Clinical Presentation (Hard Rule #7)**: Clean, textbook-grade anatomical tissue shading (warm ivory cortical bone, blueish hyaline cartilage, deep red striated muscle, pearly white tendons, arterial red, venous blue, neural gold, hepatic brown-red, biliary olive-green, lymphatic emerald). Zero gore or explicit reproductive structures.

### B. Real-Time WebGL Performance Gate (60 FPS Budget)
1. **Draco Geometry Compression**: All 10 system `.glb` bundles are Draco-compressed (14-bit position quantization, 10-bit normal quantization) and decoded via local WebAssembly (`/public/draco/draco_decoder.wasm`).
2. **Sub-Mesh Granularity**: Over 3,400 named `THREE.Mesh` nodes mapped to TA2 Latin and English nomenclature so raycasting (`click-to-select`) and `isolate-organ` mode operate with instant per-structure precision.
3. **Progressive Streaming + Instant Fallback**: Procedural low-poly geometry + GPU `InstancedMesh` particles render on the first frame while the Draco-compressed Z-Anatomy `.glb` bundles stream in per system.

---

## 3. License Verification & Ambiguity Escalation Workflow

To comply with **Hard Rule #5**:

1. **Automated & Manual License Audit**:
   - Inspect the exact license deed URL and version (`CC BY-SA 4.0` and `CC BY-SA 2.1 JP`).
   - Full `LICENSE` and `NOTICE` files are preserved verbatim inside `/public/anatomy/LICENSE` and `/public/anatomy/NOTICE`.
2. **Handling Ambiguous, Non-Commercial (`CC BY-NC`), or Unclear Licenses**:
   - **Quarantine Rule**: Any asset labeled `"Editorial Use Only"`, `"CC BY-NC"`, `"Custom / Ask Author"`, or lacking a verifiable author/URL is **blocked from inclusion**.

---

## 4. Active Asset Registry

Every 3D asset active in the simulator is recorded below with its Name, Author, License, and URL:

| Asset Name | Layer / System | Author / Provenance | License | Source URL / Local Path |
| :--- | :--- | :--- | :--- | :--- |
| `regional_male.glb` (256 Human Surface Regions) | `skin` (Integumentary) | Z-Anatomy (Gauthier Kervyn) / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/regional_male.glb` (`/public/anatomy/regional_male.glb`) |
| `skeletal_male.glb` (335 Cranial, Axial & Appendicular Bones) | `skeleton` (Musculoskeletal) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/skeletal_male.glb` (`/public/anatomy/skeletal_male.glb`) |
| `muscular_male.glb` (1,110 Striated Muscles, Tendons & Fascial Sheets) | `muscle` & `fat` (Musculoskeletal & Fascia) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/muscular_male.glb` (`/public/anatomy/muscular_male.glb`) |
| `cardiovascular_male.glb` (640 Heart Chambers, Valves, Coronary & Systemic/Pulmonary Vessels) | `organs` (Heart) & `vessels` (Arteries/Veins) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/cardiovascular_male.glb` (`/public/anatomy/cardiovascular_male.glb`) |
| `respiratory_male.glb` (35 Trachea, Bronchial Tree & Pulmonary Lobes) | `organs` (Respiratory) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/respiratory_male.glb` (`/public/anatomy/respiratory_male.glb`) |
| `digestive_male.glb` (42 Esophagus, Stomach, Liver Segments, Gallbladder, Pancreas, Intestines & Teeth) | `organs` (Digestive) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/digestive_male.glb` (`/public/anatomy/digestive_male.glb`) |
| `nervous_male.glb` (525 Brain Gyri/Sulci, Ventricles, Eyeballs, Spinal Cord & Cranial/Peripheral Nerves) | `organs` (Brain/Eyes) & `nerves` (Pathways) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/nervous_male.glb` (`/public/anatomy/nervous_male.glb`) |
| `renal_male.glb` (8 Kidneys, Renal Pelvis, Ureters, Urinary Bladder & Urethra) | `organs` (Renal / Urinary) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/renal_male.glb` (`/public/anatomy/renal_male.glb`) |
| `endocrine_male.glb` (6 Thyroid, Adrenal, Pituitary & Pineal Glands) | `organs` (Endocrine) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/endocrine_male.glb` (`/public/anatomy/endocrine_male.glb`) |
| `lymphatic_male.glb` (142 Spleen, Thoracic Duct & Regional Lymph Nodes) | `lymph` (Immune / Lymphatic) | Z-Anatomy / BodyParts3D (DBCLS Japan) / Anatria-3D Draco Export | **CC BY-SA 4.0** | `https://github.com/Nurkan1/Anatria-3D/blob/main/public/anatomy/lymphatic_male.glb` (`/public/anatomy/lymphatic_male.glb`) |
| `Soma-GPU-Particles-v1` (Erythrocyte `InstancedMesh`, Neural Impulse `InstancedMesh` & GI Bolus) | `vessels`, `nerves`, `organs` | SomaLab Procedural Geometry Engine | **CC0 1.0 / MIT** | `src/three/proceduralAnatomy.ts` |
