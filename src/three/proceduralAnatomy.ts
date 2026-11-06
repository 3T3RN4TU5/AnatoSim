import * as THREE from 'three';
import { LayerId } from '../data/anatomyCatalog';

export interface BuiltAnatomyScene {
  rootGroup: THREE.Group;
  layerGroups: Record<LayerId, THREE.Group>;
  partMeshes: Map<string, THREE.Object3D[]>;
  pickableMeshes: THREE.Mesh[];
  clippingPlane: THREE.Plane;
  // Animated sub-references
  heartAtriaGroup: THREE.Group;
  heartVentriclesGroup: THREE.Group;
  leftLungGroup: THREE.Group;
  rightLungGroup: THREE.Group;
  diaphragmMesh: THREE.Mesh;
  stomachMesh: THREE.Mesh;
  bolusMesh: THREE.Mesh;
  bladderMesh: THREE.Mesh;
  bloodCellsInstanced: THREE.InstancedMesh;
  bloodCellPaths: { curve: THREE.CatmullRomCurve3; isArterial: boolean; offset: number }[];
  nerveImpulsesInstanced: THREE.InstancedMesh;
  nervePaths: { curve: THREE.CatmullRomCurve3; offset: number; isReflexArc: boolean }[];
  muscleMeshesByRegion: {
    pectorals: THREE.Mesh[];
    biceps: THREE.Mesh[];
    coreAbdominals: THREE.Mesh[];
    quadriceps: THREE.Mesh[];
    hamstringsCalves: THREE.Mesh[];
  };
  rightLowerLegGroup: THREE.Group;
}

function registerPartMesh(
  mesh: THREE.Mesh,
  partId: string,
  layerId: LayerId,
  partMeshes: Map<string, THREE.Object3D[]>,
  pickableMeshes: THREE.Mesh[],
) {
  mesh.userData.partId = partId;
  mesh.userData.layerId = layerId;
  const mat = mesh.material as THREE.MeshStandardMaterial;
  mesh.userData.baseColorHex = mat.color.getHex();
  mesh.userData.baseRoughness = mat.roughness;
  mesh.userData.baseMetalness = mat.metalness;

  if (!partMeshes.has(partId)) {
    partMeshes.set(partId, []);
  }
  partMeshes.get(partId)!.push(mesh);
  pickableMeshes.push(mesh);
}

export function buildProceduralAnatomy(clippingPlane: THREE.Plane): BuiltAnatomyScene {
  const rootGroup = new THREE.Group();
  const partMeshes = new Map<string, THREE.Object3D[]>();
  const pickableMeshes: THREE.Mesh[] = [];

  const layerIds: LayerId[] = [
    'skin',
    'fat',
    'muscle',
    'skeleton',
    'organs',
    'vessels',
    'nerves',
    'lymph',
  ];

  const layerGroups = {} as Record<LayerId, THREE.Group>;
  for (const id of layerIds) {
    const g = new THREE.Group();
    g.name = `layer_${id}`;
    layerGroups[id] = g;
    rootGroup.add(g);
  }

  const createMat = (
    color: number,
    roughness: number,
    metalness = 0.05,
    opacity = 1.0,
  ) =>
    new THREE.MeshPhysicalMaterial({
      color,
      roughness,
      metalness,
      transparent: opacity < 0.99,
      opacity,
      side: THREE.DoubleSide,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });

  // =========================================================================
  // 1. SKIN LAYER (Anatomical Integumentary Envelope)
  // =========================================================================
  const skinMat = () => createMat(0xe2a98b, 0.55, 0.02, 0.22);
  const torsoLathePoints = [
    new THREE.Vector2(0.0, -0.09),
    new THREE.Vector2(0.148, -0.05),
    new THREE.Vector2(0.158, 0.02),
    new THREE.Vector2(0.138, 0.16),
    new THREE.Vector2(0.168, 0.34),
    new THREE.Vector2(0.188, 0.48),
    new THREE.Vector2(0.066, 0.54),
    new THREE.Vector2(0.058, 0.63),
    new THREE.Vector2(0.0, 0.64),
  ];
  const skinTorsoGeo = new THREE.LatheGeometry(torsoLathePoints, 32);
  skinTorsoGeo.scale(1.0, 1.0, 0.66);
  const skinTorso = new THREE.Mesh(skinTorsoGeo, skinMat());
  registerPartMesh(skinTorso, 'skin_integument', 'skin', partMeshes, pickableMeshes);
  layerGroups.skin.add(skinTorso);

  const skinHead = new THREE.Mesh(new THREE.SphereGeometry(0.11, 28, 22), skinMat());
  skinHead.scale.set(0.86, 1.14, 0.96);
  skinHead.position.set(0, 0.745, 0.01);
  registerPartMesh(skinHead, 'skin_integument', 'skin', partMeshes, pickableMeshes);
  layerGroups.skin.add(skinHead);

  for (const side of [-1, 1]) {
    const skinUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.24, 12, 18), skinMat());
    skinUpperArm.position.set(side * 0.22, 0.36, 0.0);
    skinUpperArm.rotation.z = side * 0.07;
    const skinForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.038, 0.23, 12, 18), skinMat());
    skinForearm.position.set(side * 0.242, 0.1, 0.012);
    skinForearm.rotation.z = side * 0.04;
    const skinHand = new THREE.Mesh(new THREE.SphereGeometry(0.036, 14, 14), skinMat());
    skinHand.scale.set(0.65, 1.35, 0.38);
    skinHand.position.set(side * 0.252, -0.06, 0.02);

    const skinThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.32, 12, 18), skinMat());
    skinThigh.position.set(side * 0.095, -0.24, 0.005);
    const skinCalf = new THREE.Mesh(new THREE.CapsuleGeometry(0.052, 0.32, 12, 18), skinMat());
    skinCalf.position.set(side * 0.095, -0.61, -0.005);
    const skinFoot = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.09, 10, 14), skinMat());
    skinFoot.rotation.x = Math.PI / 2;
    skinFoot.position.set(side * 0.095, -0.82, 0.035);

    for (const m of [skinUpperArm, skinForearm, skinHand, skinThigh, skinCalf, skinFoot]) {
      registerPartMesh(m, 'skin_integument', 'skin', partMeshes, pickableMeshes);
      layerGroups.skin.add(m);
    }
  }

  // =========================================================================
  // 2. FAT LAYER (Subcutaneous Adipose Tissue & Visceral Omentum Pad)
  // =========================================================================
  const fatMat = () => createMat(0xfacc15, 0.65, 0.02, 0.32);
  const fatTorsoGeo = new THREE.LatheGeometry(torsoLathePoints, 28);
  fatTorsoGeo.scale(0.95, 0.96, 0.62);
  const fatTorso = new THREE.Mesh(fatTorsoGeo, fatMat());
  registerPartMesh(fatTorso, 'skin_integument', 'fat', partMeshes, pickableMeshes);
  layerGroups.fat.add(fatTorso);

  // =========================================================================
  // 3. SKELETON LAYER (Cranium, Facial Bones, 24 Vertebrae, 12 Rib Pairs, Scapulae, Pelvis, Dual Forearm/Crural Bones, Hands & Feet)
  // =========================================================================
  const boneMat = () => createMat(0xf1f5f9, 0.42, 0.06, 0.96);
  const cartilageMat = () => createMat(0xbae6fd, 0.25, 0.1, 0.86);

  // Cranium Vault, Zygomatic/Maxilla & Mandible
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.094, 24, 20), boneMat());
  cranium.scale.set(0.85, 1.02, 0.98);
  cranium.position.set(0, 0.76, -0.004);
  const maxilla = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.058, 16), boneMat());
  maxilla.scale.set(0.95, 1.0, 0.85);
  maxilla.position.set(0, 0.7, 0.026);
  const mandible = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.012, 10, 20, Math.PI), boneMat());
  mandible.rotation.x = Math.PI / 2 + 0.22;
  mandible.position.set(0, 0.662, 0.018);

  for (const m of [cranium, maxilla, mandible]) {
    registerPartMesh(m, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
    layerGroups.skeleton.add(m);
  }

  // Vertebral Column (24 articulated vertebrae + intervertebral discs + spinous processes + sacrum)
  for (let i = 0; i < 22; i++) {
    const t = i / 21;
    const y = 0.62 - t * 0.63;
    const zCurve = Math.sin(t * Math.PI * 2.1) * 0.02 - 0.055;
    const radius = 0.018 + t * 0.013;
    const vertebra = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.03, 0.019, 14),
      boneMat(),
    );
    vertebra.position.set(0, y, zCurve);
    registerPartMesh(vertebra, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
    layerGroups.skeleton.add(vertebra);

    // Intervertebral fibrocartilage disc
    if (i < 21) {
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.96, radius * 0.96, 0.006, 12),
        cartilageMat(),
      );
      disc.position.set(0, y - 0.013, zCurve);
      registerPartMesh(disc, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
      layerGroups.skeleton.add(disc);
    }
  }

  // Sacrum & Coccyx wedge
  const sacrum = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.085, 12), boneMat());
  sacrum.rotation.z = Math.PI;
  sacrum.rotation.x = -0.22;
  sacrum.scale.set(1.1, 1.0, 0.55);
  sacrum.position.set(0, -0.045, -0.058);
  registerPartMesh(sacrum, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
  layerGroups.skeleton.add(sacrum);

  // Manubrium, Sternum Body & Xiphoid Process + 10 Rib Pairs with Costal Cartilage
  const manubrium = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.018, 0.045, 6), boneMat());
  manubrium.scale.set(1.0, 1.0, 0.38);
  manubrium.position.set(0, 0.485, 0.086);
  const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.145, 0.012), boneMat());
  sternum.position.set(0, 0.39, 0.094);
  registerPartMesh(manubrium, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
  registerPartMesh(sternum, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
  layerGroups.skeleton.add(manubrium, sternum);

  for (let r = 0; r < 10; r++) {
    const ry = 0.485 - r * 0.025;
    const rScaleX = 0.105 + Math.sin((r / 9) * Math.PI * 0.85) * 0.048;
    const arcLen = r < 7 ? Math.PI * 0.92 : r < 9 ? Math.PI * 0.78 : Math.PI * 0.55;
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(rScaleX, 0.0068, 8, 22, arcLen),
        r < 7 ? boneMat() : cartilageMat(),
      );
      rib.rotation.x = Math.PI / 2 + 0.2;
      rib.rotation.z = side === 1 ? -0.12 : Math.PI + 0.12;
      rib.scale.set(1.0, 0.72, 1.0);
      rib.position.set(side * 0.012, ry, 0.016);
      registerPartMesh(rib, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
      layerGroups.skeleton.add(rib);
    }
  }

  // Pelvic Girdle (Iliac Alae + Pelvic Brim + Pubic Symphysis)
  const pelvisRing = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.022, 12, 26), boneMat());
  pelvisRing.rotation.x = Math.PI / 2 - 0.28;
  pelvisRing.scale.set(1.18, 0.74, 1.15);
  pelvisRing.position.set(0, -0.045, -0.004);
  registerPartMesh(pelvisRing, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
  layerGroups.skeleton.add(pelvisRing);

  for (const side of [-1, 1]) {
    const iliumWing = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), boneMat());
    iliumWing.scale.set(0.32, 1.05, 0.88);
    iliumWing.rotation.z = side * -0.38;
    iliumWing.rotation.y = side * 0.35;
    iliumWing.position.set(side * 0.105, -0.005, -0.015);
    registerPartMesh(iliumWing, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
    layerGroups.skeleton.add(iliumWing);

    // Scapula (Shoulder Blade)
    const scapula = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.13, 4), boneMat());
    scapula.rotation.z = Math.PI + side * 0.18;
    scapula.scale.set(1.1, 1.0, 0.22);
    scapula.position.set(side * 0.115, 0.42, -0.068);
    registerPartMesh(scapula, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
    layerGroups.skeleton.add(scapula);
  }

  // Appendicular Skeleton (Clavicles, Humerus, Radius + Ulna, Carpals/Hand, Femur, Patella, Tibia + Fibula, Foot)
  const rightLowerLegGroup = new THREE.Group();
  rightLowerLegGroup.position.set(0.095, -0.44, 0.01);
  layerGroups.skeleton.add(rightLowerLegGroup);

  for (const side of [-1, 1]) {
    const clavicle = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0085, 0.165, 12), boneMat());
    clavicle.rotation.z = (Math.PI / 2) * side - side * 0.1;
    clavicle.position.set(side * 0.095, 0.505, 0.048);
    registerPartMesh(clavicle, 'skeleton_axial', 'skeleton', partMeshes, pickableMeshes);
    layerGroups.skeleton.add(clavicle);

    // Humeral head + shaft
    const humeralHead = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 14), boneMat());
    humeralHead.position.set(side * 0.195, 0.485, 0.0);
    const humerus = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.013, 0.255, 14), boneMat());
    humerus.position.set(side * 0.214, 0.36, 0.0);
    humerus.rotation.z = side * 0.06;

    // Dual forearm bones: Radius (lateral) & Ulna (medial)
    const radiusBone = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.01, 0.225, 12), boneMat());
    radiusBone.position.set(side * 0.244, 0.11, 0.018);
    const ulnaBone = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0075, 0.23, 12), boneMat());
    ulnaBone.position.set(side * 0.226, 0.11, 0.008);

    // Hand carpals/metacarpals
    const handBones = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.075, 0.012), boneMat());
    handBones.position.set(side * 0.248, -0.055, 0.02);

    // Femoral head/neck + shaft + condyles
    const femoralHead = new THREE.Mesh(new THREE.SphereGeometry(0.026, 14, 14), boneMat());
    femoralHead.position.set(side * 0.088, -0.065, 0.004);
    const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.021, 0.018, 0.355, 16), boneMat());
    femur.position.set(side * 0.095, -0.24, 0.005);

    const patella = new THREE.Mesh(new THREE.SphereGeometry(0.021, 14, 14), cartilageMat());
    patella.scale.set(1.0, 1.1, 0.58);
    patella.position.set(side * 0.095, -0.43, 0.032);

    for (const m of [humeralHead, humerus, radiusBone, ulnaBone, handBones, femoralHead, femur, patella]) {
      registerPartMesh(m, 'femur_knee_joint', 'skeleton', partMeshes, pickableMeshes);
      layerGroups.skeleton.add(m);
    }

    // Tibia (medial shinbone) & Fibula (lateral splint bone) + Tarsal/Foot arch
    const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.014, 0.35, 14), boneMat());
    const fibula = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0065, 0.34, 10), boneMat());
    const footArch = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.024, 0.11), boneMat());

    for (const m of [tibia, fibula, footArch]) {
      registerPartMesh(m, 'femur_knee_joint', 'skeleton', partMeshes, pickableMeshes);
    }

    if (side === 1) {
      tibia.position.set(-0.004, -0.18, 0);
      fibula.position.set(0.016, -0.18, -0.006);
      footArch.position.set(0, -0.37, 0.028);
      rightLowerLegGroup.add(tibia, fibula, footArch);
    } else {
      tibia.position.set(side * 0.091, -0.62, 0.005);
      fibula.position.set(side * 0.112, -0.62, -0.002);
      footArch.position.set(side * 0.095, -0.81, 0.032);
      layerGroups.skeleton.add(tibia, fibula, footArch);
    }
  }

  // =========================================================================
  // 4. MUSCLE LAYER (Major Superficial & Deep Muscle Groups + Thoracic Diaphragm)
  // =========================================================================
  const muscleMat = () => createMat(0xb91c1c, 0.46, 0.08, 0.46);
  const muscleMeshesByRegion: BuiltAnatomyScene['muscleMeshesByRegion'] = {
    pectorals: [],
    biceps: [],
    coreAbdominals: [],
    quadriceps: [],
    hamstringsCalves: [],
  };

  for (const side of [-1, 1]) {
    // Pectoralis Major & Deltoid Cap
    const pec = new THREE.Mesh(new THREE.SphereGeometry(0.072, 18, 16), muscleMat());
    pec.scale.set(1.18, 0.78, 0.42);
    pec.position.set(side * 0.072, 0.415, 0.088);
    const deltoid = new THREE.Mesh(new THREE.SphereGeometry(0.046, 16, 14), muscleMat());
    deltoid.scale.set(0.95, 1.35, 0.92);
    deltoid.position.set(side * 0.205, 0.465, 0.005);

    registerPartMesh(pec, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
    registerPartMesh(deltoid, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
    layerGroups.muscle.add(pec, deltoid);
    muscleMeshesByRegion.pectorals.push(pec, deltoid);

    // Biceps Brachii & Brachioradialis
    const bicep = new THREE.Mesh(new THREE.CapsuleGeometry(0.032, 0.16, 10, 14), muscleMat());
    bicep.position.set(side * 0.215, 0.355, 0.016);
    bicep.rotation.z = side * 0.06;
    const forearmFlexor = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.15, 10, 14), muscleMat());
    forearmFlexor.position.set(side * 0.238, 0.13, 0.02);
    registerPartMesh(bicep, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
    registerPartMesh(forearmFlexor, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
    layerGroups.muscle.add(bicep, forearmFlexor);
    muscleMeshesByRegion.biceps.push(bicep, forearmFlexor);

    // Rectus Abdominis (4-pack bellies) & External Obliques
    for (let seg = 0; seg < 4; seg++) {
      const ab = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.044, 0.024), muscleMat());
      ab.position.set(side * 0.029, 0.235 - seg * 0.052, 0.092);
      registerPartMesh(ab, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
      layerGroups.muscle.add(ab);
      muscleMeshesByRegion.coreAbdominals.push(ab);
    }
    const oblique = new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 12), muscleMat());
    oblique.scale.set(0.45, 1.35, 0.85);
    oblique.position.set(side * 0.115, 0.14, 0.035);
    registerPartMesh(oblique, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
    layerGroups.muscle.add(oblique);
    muscleMeshesByRegion.coreAbdominals.push(oblique);

    // Quadriceps (Rectus Femoris + Vastus Lateralis/Medialis)
    const quad = new THREE.Mesh(new THREE.CapsuleGeometry(0.046, 0.24, 12, 16), muscleMat());
    quad.position.set(side * 0.095, -0.23, 0.02);
    registerPartMesh(quad, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
    layerGroups.muscle.add(quad);
    muscleMeshesByRegion.quadriceps.push(quad);

    // Gluteus Maximus, Hamstrings & Gastrocnemius Calves
    const glute = new THREE.Mesh(new THREE.SphereGeometry(0.064, 16, 14), muscleMat());
    glute.scale.set(0.95, 1.05, 0.72);
    glute.position.set(side * 0.075, -0.065, -0.058);
    const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.21, 10, 14), muscleMat());
    calf.position.set(side * 0.095, -0.585, -0.014);
    registerPartMesh(glute, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
    registerPartMesh(calf, 'skeletal_muscles', 'muscle', partMeshes, pickableMeshes);
    layerGroups.muscle.add(glute, calf);
    muscleMeshesByRegion.hamstringsCalves.push(glute, calf);
  }

  // Thoracic Diaphragm Dome
  const diaphragmGeo = new THREE.SphereGeometry(0.125, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);
  diaphragmGeo.scale(1.05, 0.42, 0.72);
  const diaphragmMesh = new THREE.Mesh(diaphragmGeo, createMat(0xdc2626, 0.4, 0.08, 0.78));
  diaphragmMesh.position.set(0, 0.255, 0.01);
  registerPartMesh(diaphragmMesh, 'diaphragm', 'muscle', partMeshes, pickableMeshes);
  layerGroups.muscle.add(diaphragmMesh);

  // =========================================================================
  // 5. ORGANS LAYER (Heart, Lungs + Bronchi, Brain, GI Tract, Liver/Pancreas, Kidneys)
  // =========================================================================
  // 5A. 4-Chamber Animated Heart with Aortic Root & Pulmonary Trunk
  const heartRoot = new THREE.Group();
  heartRoot.position.set(0.022, 0.365, 0.038);
  layerGroups.organs.add(heartRoot);

  const heartAtriaGroup = new THREE.Group();
  const heartVentriclesGroup = new THREE.Group();
  heartRoot.add(heartAtriaGroup, heartVentriclesGroup);

  const raMesh = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 14), createMat(0x2563eb, 0.32, 0.1));
  raMesh.position.set(-0.022, 0.022, 0.0);
  const laMesh = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 14), createMat(0xe11d48, 0.32, 0.1));
  laMesh.position.set(0.022, 0.024, -0.004);
  heartAtriaGroup.add(raMesh, laMesh);

  const rvMesh = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.062, 16), createMat(0x1d4ed8, 0.3, 0.12));
  rvMesh.rotation.z = Math.PI + 0.22;
  rvMesh.position.set(-0.012, -0.018, 0.008);
  const lvMesh = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.068, 16), createMat(0xbe123c, 0.28, 0.12));
  lvMesh.rotation.z = Math.PI + 0.18;
  lvMesh.position.set(0.018, -0.02, 0.002);
  heartVentriclesGroup.add(rvMesh, lvMesh);

  for (const m of [raMesh, laMesh, rvMesh, lvMesh]) {
    registerPartMesh(m, 'heart', 'organs', partMeshes, pickableMeshes);
  }

  // 5B. Lungs (Trachea, Left/Right Main Bronchi, Left 2-lobe, Right 3-lobe)
  const tracheaMat = createMat(0x93c5fd, 0.35, 0.05);
  const trachea = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.135, 16), tracheaMat);
  trachea.position.set(0, 0.51, 0.015);
  registerPartMesh(trachea, 'lungs', 'organs', partMeshes, pickableMeshes);
  layerGroups.organs.add(trachea);

  for (const side of [-1, 1]) {
    const bronchus = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.007, 0.065, 12), tracheaMat);
    bronchus.rotation.z = side * 0.78;
    bronchus.position.set(side * 0.028, 0.435, 0.014);
    registerPartMesh(bronchus, 'lungs', 'organs', partMeshes, pickableMeshes);
    layerGroups.organs.add(bronchus);
  }

  const leftLungGroup = new THREE.Group();
  leftLungGroup.position.set(0.078, 0.385, 0.012);
  const rightLungGroup = new THREE.Group();
  rightLungGroup.position.set(-0.078, 0.385, 0.012);
  layerGroups.organs.add(leftLungGroup, rightLungGroup);

  const lungMat = () => createMat(0xfda4af, 0.48, 0.04, 0.88);
  const lUpper = new THREE.Mesh(new THREE.SphereGeometry(0.054, 18, 16), lungMat());
  lUpper.scale.set(0.82, 1.25, 0.92);
  lUpper.position.set(0, 0.032, 0);
  const lLower = new THREE.Mesh(new THREE.SphereGeometry(0.056, 18, 16), lungMat());
  lLower.scale.set(0.85, 1.18, 0.95);
  lLower.position.set(0.005, -0.032, 0);
  leftLungGroup.add(lUpper, lLower);

  const rUpper = new THREE.Mesh(new THREE.SphereGeometry(0.052, 18, 16), lungMat());
  rUpper.scale.set(0.88, 1.1, 0.92);
  rUpper.position.set(0, 0.042, 0);
  const rMiddle = new THREE.Mesh(new THREE.SphereGeometry(0.048, 16, 14), lungMat());
  rMiddle.scale.set(0.88, 0.85, 0.92);
  rMiddle.position.set(-0.004, 0.0, 0.006);
  const rLower = new THREE.Mesh(new THREE.SphereGeometry(0.056, 18, 16), lungMat());
  rLower.scale.set(0.9, 1.12, 0.95);
  rLower.position.set(-0.004, -0.038, 0);
  rightLungGroup.add(rUpper, rMiddle, rLower);

  for (const m of [lUpper, lLower, rUpper, rMiddle, rLower]) {
    registerPartMesh(m, 'lungs', 'organs', partMeshes, pickableMeshes);
  }

  // 5C. Brain (Frontal/Parietal/Temporal/Occipital Lobes, Cerebellum, Brainstem)
  const brainGroup = new THREE.Group();
  brainGroup.position.set(0, 0.745, 0.0);
  layerGroups.organs.add(brainGroup);

  for (const side of [-1, 1]) {
    const hemisphere = new THREE.Mesh(new THREE.SphereGeometry(0.068, 22, 18), createMat(0xf472b6, 0.42, 0.05));
    hemisphere.scale.set(0.68, 0.95, 1.18);
    hemisphere.position.set(side * 0.034, 0.015, 0.005);
    const temporalLobe = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 14), createMat(0xec4899, 0.44, 0.05));
    temporalLobe.scale.set(0.75, 0.65, 1.25);
    temporalLobe.position.set(side * 0.052, -0.012, 0.012);
    registerPartMesh(hemisphere, 'brain', 'organs', partMeshes, pickableMeshes);
    registerPartMesh(temporalLobe, 'brain', 'organs', partMeshes, pickableMeshes);
    brainGroup.add(hemisphere, temporalLobe);
  }
  const cerebellum = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 14), createMat(0xdb2777, 0.48, 0.05));
  cerebellum.scale.set(1.35, 0.72, 0.82);
  cerebellum.position.set(0, -0.042, -0.042);
  const brainstem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.012, 0.065, 12), createMat(0xfbcfe8, 0.38, 0.05));
  brainstem.position.set(0, -0.065, -0.012);
  registerPartMesh(cerebellum, 'brain', 'organs', partMeshes, pickableMeshes);
  registerPartMesh(brainstem, 'brain', 'organs', partMeshes, pickableMeshes);
  brainGroup.add(cerebellum, brainstem);

  // 5D. Digestive Tract (Esophagus, J-Shaped Stomach, Right/Left Liver Lobes, Gallbladder, Pancreas, Small & Large Intestines + Bolus)
  const esophagus = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.011, 0.24, 12), createMat(0xfb7185, 0.45, 0.05));
  esophagus.position.set(0.01, 0.36, -0.012);
  registerPartMesh(esophagus, 'stomach', 'organs', partMeshes, pickableMeshes);
  layerGroups.organs.add(esophagus);

  const stomachCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.01, 0.24, 0.0),
    new THREE.Vector3(0.068, 0.2, 0.032),
    new THREE.Vector3(0.055, 0.14, 0.042),
    new THREE.Vector3(0.005, 0.13, 0.025),
  ]);
  const stomachMesh = new THREE.Mesh(
    new THREE.TubeGeometry(stomachCurve, 22, 0.032, 14, false),
    createMat(0xf43f5e, 0.36, 0.08),
  );
  registerPartMesh(stomachMesh, 'stomach', 'organs', partMeshes, pickableMeshes);
  layerGroups.organs.add(stomachMesh);

  // Dual-lobed Liver, Gallbladder, Pancreas
  const liverRightLobe = new THREE.Mesh(new THREE.SphereGeometry(0.064, 18, 16), createMat(0x881337, 0.34, 0.1));
  liverRightLobe.scale.set(1.18, 0.72, 0.85);
  liverRightLobe.position.set(-0.056, 0.202, 0.032);
  const liverLeftLobe = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.095, 14), createMat(0x9f1239, 0.34, 0.1));
  liverLeftLobe.rotation.z = -Math.PI / 2 + 0.25;
  liverLeftLobe.scale.set(0.85, 1.0, 0.55);
  liverLeftLobe.position.set(0.005, 0.215, 0.042);

  const gallbladder = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), createMat(0x10b981, 0.28, 0.15));
  gallbladder.position.set(-0.038, 0.165, 0.048);
  const pancreas = new THREE.Mesh(new THREE.CapsuleGeometry(0.016, 0.065, 10, 12), createMat(0xfde047, 0.45, 0.05));
  pancreas.rotation.z = Math.PI / 2 - 0.15;
  pancreas.position.set(0.01, 0.145, 0.005);

  for (const m of [liverRightLobe, liverLeftLobe, gallbladder, pancreas]) {
    registerPartMesh(m, 'liver_pancreas', 'organs', partMeshes, pickableMeshes);
    layerGroups.organs.add(m);
  }

  // Small Intestine Coil & Haustrated Large Intestine Frame
  const giBolusPoints = [
    new THREE.Vector3(0.01, 0.46, -0.01), // Esophagus top
    new THREE.Vector3(0.01, 0.25, 0.0), // Gastroesophageal junction
    new THREE.Vector3(0.062, 0.18, 0.038), // Stomach fundus/body
    new THREE.Vector3(0.01, 0.13, 0.025), // Pylorus / Duodenum
    new THREE.Vector3(-0.04, 0.08, 0.042), // Jejunum loop 1
    new THREE.Vector3(0.042, 0.05, 0.045), // Jejunum loop 2
    new THREE.Vector3(-0.035, 0.01, 0.042), // Ileum loop 1
    new THREE.Vector3(0.035, -0.02, 0.038), // Ileum loop 2
    new THREE.Vector3(-0.072, -0.02, 0.025), // Cecum
    new THREE.Vector3(-0.072, 0.1, 0.028), // Ascending colon
    new THREE.Vector3(0.072, 0.1, 0.032), // Transverse colon
    new THREE.Vector3(0.072, -0.03, 0.025), // Descending colon
    new THREE.Vector3(0.0, -0.075, 0.0), // Sigmoid / Rectum
  ];
  const giFullCurve = new THREE.CatmullRomCurve3(giBolusPoints);

  const smallIntestineCurve = new THREE.CatmullRomCurve3(giBolusPoints.slice(3, 8));
  const smallIntestineMesh = new THREE.Mesh(
    new THREE.TubeGeometry(smallIntestineCurve, 40, 0.018, 12, false),
    createMat(0xfda4af, 0.42, 0.05),
  );
  const largeIntestineCurve = new THREE.CatmullRomCurve3(giBolusPoints.slice(8));
  const largeIntestineMesh = new THREE.Mesh(
    new THREE.TubeGeometry(largeIntestineCurve, 36, 0.024, 12, false),
    createMat(0xe11d48, 0.46, 0.05),
  );
  registerPartMesh(smallIntestineMesh, 'intestines', 'organs', partMeshes, pickableMeshes);
  registerPartMesh(largeIntestineMesh, 'intestines', 'organs', partMeshes, pickableMeshes);
  layerGroups.organs.add(smallIntestineMesh, largeIntestineMesh);

  // Animated Digestive Food Bolus Sphere
  const bolusMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.02, 16, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.7,
      roughness: 0.2,
    }),
  );
  bolusMesh.userData.giCurve = giFullCurve;
  layerGroups.organs.add(bolusMesh);

  // 5E. Kidneys, Adrenal Glands, Ureters & Urinary Bladder
  for (const side of [-1, 1]) {
    const kidney = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 14), createMat(0x9f1239, 0.35, 0.1));
    kidney.scale.set(0.75, 1.3, 0.65);
    kidney.position.set(side * 0.055, 0.13, -0.028);

    const adrenal = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.02, 10), createMat(0xfbbf24, 0.4, 0.08));
    adrenal.position.set(side * 0.052, 0.168, -0.026);

    const ureterCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.048, 0.12, -0.025),
      new THREE.Vector3(side * 0.035, 0.03, -0.005),
      new THREE.Vector3(side * 0.016, -0.05, 0.028),
    ]);
    const ureter = new THREE.Mesh(
      new THREE.TubeGeometry(ureterCurve, 14, 0.0032, 8, false),
      createMat(0xfde68a, 0.38, 0.05),
    );

    for (const m of [kidney, adrenal, ureter]) {
      registerPartMesh(m, 'kidneys_bladder', 'organs', partMeshes, pickableMeshes);
      layerGroups.organs.add(m);
    }
  }
  const bladderMesh = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 14), createMat(0xfbbf24, 0.32, 0.08));
  bladderMesh.position.set(0, -0.055, 0.032);
  registerPartMesh(bladderMesh, 'kidneys_bladder', 'organs', partMeshes, pickableMeshes);
  layerGroups.organs.add(bladderMesh);

  // =========================================================================
  // 6. VESSELS LAYER (Aorta, Vena Cava, Carotid/Jugular, Subclavian/Brachial, Renal, Femoral + GPU Erythrocyte InstancedMesh)
  // =========================================================================
  const arterialMat = createMat(0xef4444, 0.28, 0.15);
  const venousMat = createMat(0x3b82f6, 0.3, 0.15);

  const aortaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.018, 0.38, 0.03),
    new THREE.Vector3(0.01, 0.45, 0.02),
    new THREE.Vector3(-0.008, 0.43, -0.005),
    new THREE.Vector3(-0.006, 0.18, -0.01),
    new THREE.Vector3(-0.004, -0.01, -0.005),
  ]);
  const venaCavaCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.018, -0.01, -0.005),
    new THREE.Vector3(0.018, 0.2, -0.005),
    new THREE.Vector3(-0.018, 0.38, 0.025),
    new THREE.Vector3(-0.018, 0.56, 0.01),
  ]);

  const aortaMesh = new THREE.Mesh(new THREE.TubeGeometry(aortaCurve, 32, 0.011, 10, false), arterialMat);
  const venaCavaMesh = new THREE.Mesh(new THREE.TubeGeometry(venaCavaCurve, 32, 0.011, 10, false), venousMat);
  registerPartMesh(aortaMesh, 'aorta_vena_cava', 'vessels', partMeshes, pickableMeshes);
  registerPartMesh(venaCavaMesh, 'aorta_vena_cava', 'vessels', partMeshes, pickableMeshes);
  layerGroups.vessels.add(aortaMesh, venaCavaMesh);

  const bloodCellPaths: BuiltAnatomyScene['bloodCellPaths'] = [];
  for (const side of [-1, 1]) {
    // Carotid Artery & Internal Jugular Vein to Brain
    const carotidCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.44, 0.015),
      new THREE.Vector3(side * 0.026, 0.58, 0.012),
      new THREE.Vector3(side * 0.028, 0.72, 0.008),
    ]);
    const carotidMesh = new THREE.Mesh(new THREE.TubeGeometry(carotidCurve, 16, 0.005, 8, false), arterialMat);
    registerPartMesh(carotidMesh, 'aorta_vena_cava', 'vessels', partMeshes, pickableMeshes);
    layerGroups.vessels.add(carotidMesh);

    // Subclavian & Brachial Artery/Vein down Upper Limbs
    const armArtery = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.0, 0.44, 0.015),
      new THREE.Vector3(side * 0.12, 0.48, 0.01),
      new THREE.Vector3(side * 0.21, 0.32, 0.008),
      new THREE.Vector3(side * 0.24, 0.06, 0.018),
    ]);
    const armArteryMesh = new THREE.Mesh(new THREE.TubeGeometry(armArtery, 20, 0.0048, 8, false), arterialMat);
    registerPartMesh(armArteryMesh, 'aorta_vena_cava', 'vessels', partMeshes, pickableMeshes);
    layerGroups.vessels.add(armArteryMesh);

    // Iliac & Femoral Artery/Vein down Lower Limbs
    const legArtery = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.004, -0.01, -0.005),
      new THREE.Vector3(side * 0.065, -0.15, 0.005),
      new THREE.Vector3(side * 0.09, -0.45, 0.005),
      new THREE.Vector3(side * 0.09, -0.72, 0.005),
    ]);
    const legVein = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.102, -0.72, 0.008),
      new THREE.Vector3(side * 0.102, -0.45, 0.008),
      new THREE.Vector3(side * 0.075, -0.15, 0.008),
      new THREE.Vector3(0.018, -0.01, -0.005),
    ]);
    const mArt = new THREE.Mesh(new THREE.TubeGeometry(legArtery, 22, 0.006, 8, false), arterialMat);
    const mVein = new THREE.Mesh(new THREE.TubeGeometry(legVein, 22, 0.006, 8, false), venousMat);
    registerPartMesh(mArt, 'aorta_vena_cava', 'vessels', partMeshes, pickableMeshes);
    registerPartMesh(mVein, 'aorta_vena_cava', 'vessels', partMeshes, pickableMeshes);
    layerGroups.vessels.add(mArt, mVein);

    for (let k = 0; k < 12; k++) {
      bloodCellPaths.push({ curve: legArtery, isArterial: true, offset: k / 12 });
      bloodCellPaths.push({ curve: legVein, isArterial: false, offset: k / 12 });
    }
    for (let k = 0; k < 6; k++) {
      bloodCellPaths.push({ curve: carotidCurve, isArterial: true, offset: k / 6 });
      bloodCellPaths.push({ curve: armArtery, isArterial: true, offset: k / 6 });
    }
  }

  // Add pulmonary & systemic trunk particles
  const pulmonaryLoop = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.012, 0.36, 0.04),
    new THREE.Vector3(-0.075, 0.39, 0.015),
    new THREE.Vector3(0.0, 0.41, 0.02),
    new THREE.Vector3(0.075, 0.39, 0.015),
    new THREE.Vector3(0.022, 0.38, 0.035),
  ]);
  for (let k = 0; k < 18; k++) {
    bloodCellPaths.push({ curve: aortaCurve, isArterial: true, offset: k / 18 });
    bloodCellPaths.push({ curve: venaCavaCurve, isArterial: false, offset: k / 18 });
    bloodCellPaths.push({ curve: pulmonaryLoop, isArterial: k % 2 === 0, offset: k / 18 });
  }

  const rbcGeo = new THREE.SphereGeometry(0.0085, 8, 8);
  rbcGeo.scale(1.0, 0.55, 1.0); // Biconcave disc silhouette
  const rbcMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.25,
    metalness: 0.1,
    clippingPlanes: [clippingPlane],
  });
  const bloodCellsInstanced = new THREE.InstancedMesh(rbcGeo, rbcMat, bloodCellPaths.length);
  bloodCellsInstanced.frustumCulled = false;
  layerGroups.vessels.add(bloodCellsInstanced);

  // =========================================================================
  // 7. NERVES LAYER (Spinal Cord, Brachial & Sciatic Plexuses, Patellar Reflex Arc + Action Potentials)
  // =========================================================================
  const nerveMat = createMat(0xf59e0b, 0.32, 0.12);
  const spinalCordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0.68, -0.012),
    new THREE.Vector3(0, 0.42, -0.045),
    new THREE.Vector3(0, 0.12, -0.038),
  ]);
  const spinalMesh = new THREE.Mesh(new THREE.TubeGeometry(spinalCordCurve, 26, 0.009, 10, false), nerveMat);
  registerPartMesh(spinalMesh, 'spinal_cord_nerves', 'nerves', partMeshes, pickableMeshes);
  layerGroups.nerves.add(spinalMesh);

  for (const side of [-1, 1]) {
    const brachialPlexus = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.54, -0.035),
      new THREE.Vector3(side * 0.14, 0.47, -0.01),
      new THREE.Vector3(side * 0.22, 0.28, 0.005),
      new THREE.Vector3(side * 0.245, 0.04, 0.018),
    ]);
    const brachialMesh = new THREE.Mesh(new THREE.TubeGeometry(brachialPlexus, 18, 0.0042, 8, false), nerveMat);
    registerPartMesh(brachialMesh, 'spinal_cord_nerves', 'nerves', partMeshes, pickableMeshes);
    layerGroups.nerves.add(brachialMesh);
  }

  const reflexArcCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.095, -0.43, 0.032), // Patellar tendon spindle
    new THREE.Vector3(0.065, -0.18, -0.01), // Femoral/sciatic afferent
    new THREE.Vector3(0.0, 0.12, -0.038), // L3-L4 spinal cord synapse
    new THREE.Vector3(0.085, -0.16, 0.015), // Alpha motor efferent
    new THREE.Vector3(0.095, -0.25, 0.025), // Quadriceps motor endplate
  ]);
  const reflexArcMesh = new THREE.Mesh(new THREE.TubeGeometry(reflexArcCurve, 28, 0.0055, 8, false), nerveMat);
  registerPartMesh(reflexArcMesh, 'spinal_cord_nerves', 'nerves', partMeshes, pickableMeshes);
  layerGroups.nerves.add(reflexArcMesh);

  const nervePaths: BuiltAnatomyScene['nervePaths'] = [];
  for (let k = 0; k < 16; k++) {
    nervePaths.push({ curve: spinalCordCurve, offset: k / 16, isReflexArc: false });
    nervePaths.push({ curve: reflexArcCurve, offset: k / 16, isReflexArc: true });
  }
  const impulseGeo = new THREE.SphereGeometry(0.009, 8, 8);
  const impulseMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
  });
  const nerveImpulsesInstanced = new THREE.InstancedMesh(impulseGeo, impulseMat, nervePaths.length);
  nerveImpulsesInstanced.frustumCulled = false;
  layerGroups.nerves.add(nerveImpulsesInstanced);

  // =========================================================================
  // 8. LYMPH LAYER (Thoracic Duct, Cervical/Axillary/Inguinal Nodes, Thymus & Spleen)
  // =========================================================================
  const lymphMat = createMat(0x10b981, 0.35, 0.1);
  const thoracicDuctCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.0, 0.05, -0.015),
    new THREE.Vector3(-0.015, 0.25, -0.01),
    new THREE.Vector3(-0.045, 0.48, 0.01),
  ]);
  const lymphDuctMesh = new THREE.Mesh(new THREE.TubeGeometry(thoracicDuctCurve, 20, 0.0055, 8, false), lymphMat);
  registerPartMesh(lymphDuctMesh, 'lymph_immune_network', 'lymph', partMeshes, pickableMeshes);
  layerGroups.lymph.add(lymphDuctMesh);

  const nodePositions: [number, number, number][] = [
    [-0.045, 0.56, 0.02],
    [0.045, 0.56, 0.02],
    [-0.15, 0.42, 0.01],
    [0.15, 0.42, 0.01],
    [-0.065, -0.05, 0.025],
    [0.065, -0.05, 0.025],
    [0.0, 0.44, 0.055], // Thymus gland
    [0.085, 0.19, 0.01], // Spleen position
  ];
  for (let i = 0; i < nodePositions.length; i++) {
    const isSpleen = i === nodePositions.length - 1;
    const isThymus = i === nodePositions.length - 2;
    const nodeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(isSpleen ? 0.032 : isThymus ? 0.02 : 0.013, 14, 14),
      lymphMat,
    );
    nodeMesh.position.set(...nodePositions[i]);
    registerPartMesh(nodeMesh, 'lymph_immune_network', 'lymph', partMeshes, pickableMeshes);
    layerGroups.lymph.add(nodeMesh);
  }

  return {
    rootGroup,
    layerGroups,
    partMeshes,
    pickableMeshes,
    clippingPlane,
    heartAtriaGroup,
    heartVentriclesGroup,
    leftLungGroup,
    rightLungGroup,
    diaphragmMesh,
    stomachMesh,
    bolusMesh,
    bladderMesh,
    bloodCellsInstanced,
    bloodCellPaths,
    nerveImpulsesInstanced,
    nervePaths,
    muscleMeshesByRegion,
    rightLowerLegGroup,
  };
}
