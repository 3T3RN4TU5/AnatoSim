import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LayerId } from '../data/anatomyCatalog';
import { BuiltAnatomyScene } from './proceduralAnatomy';

export interface ZAnatomyOrganMeta {
  id: string;
  en: string;
  la: string;
  sys: string;
}

type ZAnatomyLookupTable = Record<string, Record<string, ZAnatomyOrganMeta>>;

// Calibrated transform mapping Z-Anatomy metric coordinates (feet at Y=0.0m, crown at Y=1.70m)
// to SomaLab's viewport coordinates (feet at Y=-0.82, crown at Y=+0.81)
const Z_SCALE = 0.96;
const Z_OFFSET_Y = -0.82;
const Z_TO_SCENE_MATRIX = new THREE.Matrix4()
  .makeTranslation(0, Z_OFFSET_Y, 0)
  .multiply(new THREE.Matrix4().makeScale(Z_SCALE, Z_SCALE, Z_SCALE));

const VENOUS_RE = /\b(vena|venae|venous|vein|veins|sinus)\b/i;
const ARTERIAL_RE = /\b(arteria|arteriae|arterial|artery|arteries|aorta|truncus)\b/i;
const FASCIA_BURSA_RE =
  /\b(fascia|sheath|retinaculum|bursa|septum intermusculare|adipos|fat|panniculus)\b/i;
const TENDON_RE = /\b(tendo|tendon|tendons|tendinis|aponeurosis)\b/i;
const LIGAMENT_RE = /\b(ligamentum|ligament|ligaments|ligamenta)\b/i;
const CARTILAGE_RE =
  /\b(cartilago|cartilage|cartilagines|meniscus|discus|labrum|intervertebral disc)\b/i;
const TOOTH_RE = /\b(dens|dentes|tooth|teeth|molar|incisor|canine|premolar|enamel|gingiva)\b/i;

function fnv1aHash(text: string): number {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

function hashSpread(seed: number, shift: number): number {
  return (((seed >>> shift) & 0xff) / 128) - 1;
}

function getTissueStyle(meta: ZAnatomyOrganMeta): {
  color: THREE.Color;
  roughness: number;
  metalness: number;
  intrinsicOpacity: number;
  polygonOffsetFactor: number;
} {
  const fullText = `${meta.la} ${meta.en}`;
  let baseHex = '#d4c5b0';
  let roughness = 0.52;
  const metalness = 0.04;
  let intrinsicOpacity = 1.0;
  let allowVariation = true;
  let polygonOffsetFactor = 0;

  if (meta.sys === 'regional' || meta.sys === 'integumentary') {
    if (/\b(hairs of head|hairs of eyebrow|eyelashes|eyebrow)\b/i.test(fullText)) {
      baseHex = '#2c221e';
      roughness = 0.65;
    } else if (/\b(nail plate|perionyx)\b/i.test(fullText)) {
      baseHex = '#edd9ce';
      roughness = 0.32;
    } else if (/\b(lip|labial commissure)\b/i.test(fullText)) {
      baseHex = '#c97b72';
      roughness = 0.45;
    } else {
      baseHex = '#e2b49a';
      roughness = 0.54;
    }
    allowVariation = false;
    polygonOffsetFactor = -2;
  } else if (meta.sys === 'skeletal' || meta.sys === 'articular') {
    if (CARTILAGE_RE.test(fullText)) {
      baseHex = '#b8d0d8';
      roughness = 0.38;
    } else if (LIGAMENT_RE.test(fullText)) {
      baseHex = '#d6cbb4';
      roughness = 0.58;
      polygonOffsetFactor = -1;
    } else {
      baseHex = '#e6decb';
      roughness = 0.68;
    }
  } else if (meta.sys === 'muscular') {
    if (FASCIA_BURSA_RE.test(fullText)) {
      baseHex = '#e3c869';
      roughness = 0.58;
      intrinsicOpacity = 0.45;
      polygonOffsetFactor = -1;
    } else if (TENDON_RE.test(fullText)) {
      baseHex = '#e6dfd0';
      roughness = 0.46;
      polygonOffsetFactor = -1;
    } else {
      baseHex = '#a83840';
      roughness = 0.42;
    }
  } else if (meta.sys === 'cardiovascular') {
    if (/\b(atrium|ventricle|papillary|myocardium|leaflet|heart)\b/i.test(fullText)) {
      baseHex = '#a8323a';
      roughness = 0.34;
    } else if (VENOUS_RE.test(fullText)) {
      baseHex = '#3b6ea8';
      roughness = 0.36;
    } else if (ARTERIAL_RE.test(fullText)) {
      baseHex = '#d63629';
      roughness = 0.34;
    } else {
      baseHex = '#b84244';
      roughness = 0.36;
    }
  } else if (meta.sys === 'respiratory') {
    if (/\b(trachea|bronchus|bronchi|cartilage|larynx)\b/i.test(fullText)) {
      baseHex = '#9ec5db';
      roughness = 0.42;
    } else if (/\bpleura\b/i.test(fullText)) {
      baseHex = '#e2b4b8';
      roughness = 0.35;
      intrinsicOpacity = 0.22;
    } else {
      baseHex = '#d89aa2';
      roughness = 0.46;
    }
  } else if (meta.sys === 'digestive') {
    if (TOOTH_RE.test(fullText)) {
      baseHex = '#f5efe2';
      roughness = 0.25;
      allowVariation = false;
    } else if (/\b(liver|hepar|hepatic)\b/i.test(fullText)) {
      baseHex = '#7d3c2e';
      roughness = 0.36;
    } else if (/\b(gallbladder|bile|biliaris|fellea)\b/i.test(fullText)) {
      baseHex = '#4f8238';
      roughness = 0.32;
    } else if (/\b(pancreas|pancreatic)\b/i.test(fullText)) {
      baseHex = '#dfc27d';
      roughness = 0.46;
    } else if (/\b(stomach|gaster|oesophagus|esophagus)\b/i.test(fullText)) {
      baseHex = '#cf8572';
      roughness = 0.38;
    } else {
      baseHex = '#c78c6a';
      roughness = 0.42;
    }
  } else if (meta.sys === 'renal') {
    if (/\b(kidney|ren)\b/i.test(fullText)) {
      baseHex = '#8f4436';
      roughness = 0.38;
    } else {
      baseHex = '#deb854';
      roughness = 0.38;
    }
  } else if (meta.sys === 'endocrine') {
    baseHex = '#d9a441';
    roughness = 0.42;
  } else if (meta.sys === 'lymphatic') {
    if (/\b(spleen|splen)\b/i.test(fullText)) {
      baseHex = '#753452';
      roughness = 0.38;
    } else {
      baseHex = '#78b87a';
      roughness = 0.42;
    }
  } else if (meta.sys === 'nervous') {
    if (/\b(sclera)\b/i.test(fullText)) {
      baseHex = '#f4f0e8';
      roughness = 0.22;
      allowVariation = false;
    } else if (/\biris\b/i.test(fullText)) {
      baseHex = '#3b6fa8';
      roughness = 0.28;
      allowVariation = false;
    } else if (/\b(cornea|lens|anterior chamber)\b/i.test(fullText)) {
      baseHex = '#cfe2ea';
      roughness = 0.12;
      intrinsicOpacity = 0.18;
      allowVariation = false;
    } else if (/\b(vitreous)\b/i.test(fullText)) {
      baseHex = '#141a24';
      roughness = 0.2;
      intrinsicOpacity = 0.55;
      allowVariation = false;
    } else if (
      /\b(gyrus|sulcus|lobe|cortex|cerebell|thalamus|hippocampus|amygdala|caudate|putamen|corpus callosum|pons|medulla|midbrain|peduncle|ventricle|fornix)\b/i.test(
        fullText,
      )
    ) {
      baseHex = '#cfa2ab';
      roughness = 0.46;
    } else {
      baseHex = '#e6d37a';
      roughness = 0.45;
    }
  }

  const color = new THREE.Color(baseHex);
  if (allowVariation) {
    const seed = fnv1aHash(meta.id);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    color.setHSL(
      (hsl.h + hashSpread(seed, 0) * 0.012 + 1) % 1,
      Math.min(1, Math.max(0, hsl.s + hashSpread(seed, 8) * 0.05)),
      Math.min(0.95, Math.max(0.06, hsl.l + hashSpread(seed, 16) * 0.055)),
    );
  }

  return { color, roughness, metalness, intrinsicOpacity, polygonOffsetFactor };
}

function classifyPartAndLayer(meta: ZAnatomyOrganMeta): {
  partId: string;
  layerId: LayerId;
  muscleRegion?: keyof BuiltAnatomyScene['muscleMeshesByRegion'];
} {
  const fullText = `${meta.la} ${meta.en}`;

  if (meta.sys === 'regional' || meta.sys === 'integumentary') {
    return { partId: 'skin_integument', layerId: 'skin' };
  }

  if (meta.sys === 'skeletal' || meta.sys === 'articular') {
    const isLimb =
      /\b(femur|femoral|patella|tibia|tibial|fibula|fibular|tarsal|metatarsal|calcaneus|talus|navicular|cuboid|cuneiform|humerus|humeral|radius|radial|ulna|ulnar|carpal|metacarpal|scaphoid|lunate|triquetrum|pisiform|trapezium|trapezoid|capitate|hamate|phalanx|phalanges|sesamoid|knee|ankle|elbow|wrist|glenohumeral|hip joint)\b/i.test(
        fullText,
      );
    return {
      partId: isLimb ? 'femur_knee_joint' : 'skeleton_axial',
      layerId: 'skeleton',
    };
  }

  if (meta.sys === 'muscular') {
    if (FASCIA_BURSA_RE.test(fullText)) {
      return { partId: 'skin_integument', layerId: 'fat' };
    }
    if (/\bdiaphragm\b/i.test(fullText)) {
      return { partId: 'diaphragm', layerId: 'muscle' };
    }
    let muscleRegion: keyof BuiltAnatomyScene['muscleMeshesByRegion'] | undefined;
    if (/\b(pectoralis|deltoid|serratus|subclavius|intercostal)\b/i.test(fullText)) {
      muscleRegion = 'pectorals';
    } else if (
      /\b(biceps brachii|brachialis|brachioradialis|triceps|pronator|supinator|flexor carpi|extensor carpi)\b/i.test(
        fullText,
      )
    ) {
      muscleRegion = 'biceps';
    } else if (
      /\b(rectus abdominis|obliquus|oblique|transversus abdominis|pyramidalis|quadratus lumborum|psoas)\b/i.test(
        fullText,
      )
    ) {
      muscleRegion = 'coreAbdominals';
    } else if (
      /\b(rectus femoris|vastus|quadriceps|sartorius|iliacus|pectineus|adductor|gracilis|tensor fasciae)\b/i.test(
        fullText,
      )
    ) {
      muscleRegion = 'quadriceps';
    } else if (
      /\b(gluteus|biceps femoris|semitendinosus|semimembranosus|gastrocnemius|soleus|tibialis|fibularis|peroneus|plantaris|popliteus)\b/i.test(
        fullText,
      )
    ) {
      muscleRegion = 'hamstringsCalves';
    }
    return { partId: 'skeletal_muscles', layerId: 'muscle', muscleRegion };
  }

  if (meta.sys === 'cardiovascular') {
    if (/\b(atrium|ventricle|papillary|myocardium|leaflet|heart)\b/i.test(fullText)) {
      return { partId: 'heart', layerId: 'organs' };
    }
    return { partId: 'aorta_vena_cava', layerId: 'vessels' };
  }

  if (meta.sys === 'respiratory') {
    return { partId: 'lungs', layerId: 'organs' };
  }

  if (meta.sys === 'digestive') {
    if (TOOTH_RE.test(fullText)) {
      return { partId: 'skeleton_axial', layerId: 'skeleton' };
    }
    if (/\b(liver|hepar|hepatic|gallbladder|bile|pancreas|pancreatic)\b/i.test(fullText)) {
      return { partId: 'liver_pancreas', layerId: 'organs' };
    }
    if (/\b(duodenum|jejunum|ileum|colon|cecum|appendix|rectum|taenia|anal)\b/i.test(fullText)) {
      return { partId: 'intestines', layerId: 'organs' };
    }
    return { partId: 'stomach', layerId: 'organs' };
  }

  if (meta.sys === 'renal') {
    return { partId: 'kidneys_bladder', layerId: 'organs' };
  }

  if (meta.sys === 'endocrine') {
    if (/\b(suprarenal|adrenal)\b/i.test(fullText)) {
      return { partId: 'kidneys_bladder', layerId: 'organs' };
    }
    if (/\b(thyroid)\b/i.test(fullText)) {
      return { partId: 'lungs', layerId: 'organs' };
    }
    return { partId: 'brain', layerId: 'organs' };
  }

  if (meta.sys === 'lymphatic') {
    return { partId: 'lymph_immune_network', layerId: 'lymph' };
  }

  if (meta.sys === 'nervous') {
    const isBrainOrEye =
      /\b(gyrus|sulcus|lobe|cortex|cerebell|thalamus|hypothalamus|hippocampus|amygdala|caudate|putamen|globus|corpus callosum|pons|medulla oblongata|midbrain|peduncle|ventricle|fornix|aqueduct|chiasm|olfactory|commissure|colliculus|geniculate|lemniscus|olive|pyramid|vermis|sclera|iris|cornea|lens|vitreous|anterior chamber|choroid|retina|ciliary|eyeball|lacrimal)\b/i.test(
        fullText,
      );
    return {
      partId: isBrainOrEye ? 'brain' : 'spinal_cord_nerves',
      layerId: isBrainOrEye ? 'organs' : 'nerves',
    };
  }

  return { partId: 'skeleton_axial', layerId: 'skeleton' };
}

interface MergeBucket {
  key: string;
  partId: string;
  layerId: LayerId;
  roughness: number;
  metalness: number;
  intrinsicOpacity: number;
  polygonOffsetFactor: number;
  muscleRegion?: keyof BuiltAnatomyScene['muscleMeshesByRegion'];
  motionGroup?: 'heartAtria' | 'heartVentricles' | 'leftLung' | 'rightLung';
  geometries: THREE.BufferGeometry[];
  substructures: { nameEn: string; nameLatin: string }[];
}

const GLB_FILES_IN_LOAD_ORDER = [
  'skeletal_male.glb',
  'regional_male.glb',
  'respiratory_male.glb',
  'digestive_male.glb',
  'renal_male.glb',
  'endocrine_male.glb',
  'cardiovascular_male.glb',
  'muscular_male.glb',
  'nervous_male.glb',
  'lymphatic_male.glb',
];

function prepareVertexColoredGeometry(
  sourceGeom: THREE.BufferGeometry,
  worldMatrix: THREE.Matrix4,
  color: THREE.Color,
  pivotOffset?: THREE.Vector3,
): THREE.BufferGeometry | null {
  const posAttr = sourceGeom.attributes.position;
  if (!posAttr || posAttr.count === 0) return null;

  const geom = sourceGeom.clone();
  if (!geom.index) {
    const indices = new Uint32Array(posAttr.count);
    for (let i = 0; i < posAttr.count; i++) indices[i] = i;
    geom.setIndex(new THREE.BufferAttribute(indices, 1));
  }

  for (const attrName of Object.keys(geom.attributes)) {
    if (attrName !== 'position' && attrName !== 'normal') {
      geom.deleteAttribute(attrName);
    }
  }

  geom.applyMatrix4(worldMatrix);
  if (pivotOffset) {
    geom.translate(-pivotOffset.x, -pivotOffset.y, -pivotOffset.z);
  }

  // Z-Anatomy mirrors paired bilateral structures (.l / .r) using a negative scale matrix (det < 0).
  // Flip triangle winding so mirrored meshes remain counter-clockwise (front-facing) on both sides.
  if (worldMatrix.determinant() < 0 && geom.index) {
    const idxArray = geom.index.array as Uint16Array | Uint32Array;
    for (let i = 0; i + 2 < idxArray.length; i += 3) {
      const tmp = idxArray[i + 1];
      idxArray[i + 1] = idxArray[i + 2];
      idxArray[i + 2] = tmp;
    }
    geom.index.needsUpdate = true;
  }

  if (!geom.attributes.normal) {
    geom.computeVertexNormals();
  } else {
    geom.normalizeNormals();
  }

  const count = geom.attributes.position.count;
  const colors = new Float32Array(count * 3);
  const r = color.r;
  const g = color.g;
  const b = color.b;
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    colors[idx] = r;
    colors[idx + 1] = g;
    colors[idx + 2] = b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geom;
}

export async function loadRealZAnatomyAtlas(
  anatomy: BuiltAnatomyScene,
  onProgressRender: (loadedCount: number, totalCount: number) => void,
  isDisposed: () => boolean,
): Promise<void> {
  try {
    const res = await fetch('/anatomy/z_anatomy_lookup.json');
    if (!res.ok) return;
    const lookup: ZAnatomyLookupTable = await res.json();
    if (isDisposed()) return;

    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    dracoLoader.preload();

    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    let clearedAllProcedural = false;
    const clearAllProceduralFallbacksOnce = () => {
      if (clearedAllProcedural) return;
      clearedAllProcedural = true;

      const toRemove = new Set<THREE.Mesh>();
      for (const mesh of anatomy.pickableMeshes) {
        if (!mesh.userData.isZAnatomy) {
          mesh.visible = false;
          mesh.parent?.remove(mesh);
          toRemove.add(mesh);
        }
      }
      if (toRemove.size > 0) {
        const filtered = anatomy.pickableMeshes.filter((m) => !toRemove.has(m));
        anatomy.pickableMeshes.length = 0;
        anatomy.pickableMeshes.push(...filtered);
      }
      // Clear procedural muscle arrays
      anatomy.muscleMeshesByRegion.pectorals.length = 0;
      anatomy.muscleMeshesByRegion.biceps.length = 0;
      anatomy.muscleMeshesByRegion.coreAbdominals.length = 0;
      anatomy.muscleMeshesByRegion.quadriceps.length = 0;
      anatomy.muscleMeshesByRegion.hamstringsCalves.length = 0;
    };

    const tempMatrix = new THREE.Matrix4();
    const heartPivot = anatomy.heartAtriaGroup.parent!.position;
    const leftLungPivot = anatomy.leftLungGroup.position;
    const rightLungPivot = anatomy.rightLungGroup.position;

    for (let i = 0; i < GLB_FILES_IN_LOAD_ORDER.length; i++) {
      if (isDisposed()) break;
      const fileName = GLB_FILES_IN_LOAD_ORDER[i];
      const fileMetaMap = lookup[fileName] || {};

      const sanitizedMetaMap: Record<string, ZAnatomyOrganMeta> = {};
      for (const [rawNodeName, meta] of Object.entries(fileMetaMap)) {
        sanitizedMetaMap[rawNodeName] = meta;
        sanitizedMetaMap[THREE.PropertyBinding.sanitizeNodeName(rawNodeName)] = meta;
      }

      try {
        const gltf = await gltfLoader.loadAsync(`/anatomy/${fileName}`);
        if (isDisposed()) break;

        clearAllProceduralFallbacksOnce();
        gltf.scene.updateMatrixWorld(true);

        const buckets = new Map<string, MergeBucket>();

        gltf.scene.traverse((obj) => {
          if (!(obj instanceof THREE.Mesh)) return;
          const meta =
            sanitizedMetaMap[obj.name] ||
            sanitizedMetaMap[THREE.PropertyBinding.sanitizeNodeName(obj.name)];
          if (!meta || meta.sys === 'reproductive' || /pubic hair/i.test(meta.en)) return;

          const { partId, layerId, muscleRegion } = classifyPartAndLayer(meta);
          const style = getTissueStyle(meta);
          const fullText = `${meta.la} ${meta.en}`;

          let motionGroup: MergeBucket['motionGroup'];
          let pivotOffset: THREE.Vector3 | undefined;

          if (partId === 'heart' && /\batrium\b/i.test(fullText)) {
            motionGroup = 'heartAtria';
            pivotOffset = heartPivot;
          } else if (partId === 'heart') {
            motionGroup = 'heartVentricles';
            pivotOffset = heartPivot;
          } else if (partId === 'lungs' && /\bleft lung\b/i.test(fullText)) {
            motionGroup = 'leftLung';
            pivotOffset = leftLungPivot;
          } else if (partId === 'lungs' && /\bright lung\b/i.test(fullText)) {
            motionGroup = 'rightLung';
            pivotOffset = rightLungPivot;
          }

          const opacityTag = style.intrinsicOpacity < 0.9 ? 'trans' : 'solid';
          const bucketKey = `${layerId}__${partId}__${muscleRegion || 'none'}__${motionGroup || 'static'}__${opacityTag}`;

          let bucket = buckets.get(bucketKey);
          if (!bucket) {
            bucket = {
              key: bucketKey,
              partId,
              layerId,
              roughness: style.roughness,
              metalness: style.metalness,
              intrinsicOpacity: style.intrinsicOpacity,
              polygonOffsetFactor: style.polygonOffsetFactor,
              muscleRegion,
              motionGroup,
              geometries: [],
              substructures: [],
            };
            buckets.set(bucketKey, bucket);
          }

          tempMatrix.copy(Z_TO_SCENE_MATRIX).multiply(obj.matrixWorld);
          const coloredGeom = prepareVertexColoredGeometry(
            obj.geometry,
            tempMatrix,
            style.color,
            pivotOffset,
          );
          if (coloredGeom) {
            bucket.geometries.push(coloredGeom);
            bucket.substructures.push({ nameEn: meta.en, nameLatin: meta.la });
          }
        });

        for (const bucket of buckets.values()) {
          if (bucket.geometries.length === 0) continue;
          const mergedGeom = mergeGeometries(bucket.geometries, true);
          if (!mergedGeom) continue;

          const mat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff,
            vertexColors: true,
            roughness: bucket.roughness,
            metalness: bucket.metalness,
            side: THREE.FrontSide,
            polygonOffset: bucket.polygonOffsetFactor !== 0,
            polygonOffsetFactor: bucket.polygonOffsetFactor,
            polygonOffsetUnits: bucket.polygonOffsetFactor,
            clippingPlanes: [anatomy.clippingPlane],
            clipShadows: true,
          });

          const mergedMesh = new THREE.Mesh(mergedGeom, mat);
          mergedMesh.name = bucket.key;
          mergedMesh.userData.partId = bucket.partId;
          mergedMesh.userData.layerId = bucket.layerId;
          mergedMesh.userData.isZAnatomy = true;
          mergedMesh.userData.intrinsicOpacity = bucket.intrinsicOpacity;
          mergedMesh.userData.substructures = bucket.substructures;

          if (!anatomy.partMeshes.has(bucket.partId)) {
            anatomy.partMeshes.set(bucket.partId, []);
          }
          anatomy.partMeshes.get(bucket.partId)!.push(mergedMesh);
          anatomy.pickableMeshes.push(mergedMesh);

          if (bucket.motionGroup === 'heartAtria') {
            anatomy.heartAtriaGroup.add(mergedMesh);
          } else if (bucket.motionGroup === 'heartVentricles') {
            anatomy.heartVentriclesGroup.add(mergedMesh);
          } else if (bucket.motionGroup === 'leftLung') {
            anatomy.leftLungGroup.add(mergedMesh);
          } else if (bucket.motionGroup === 'rightLung') {
            anatomy.rightLungGroup.add(mergedMesh);
          } else {
            anatomy.layerGroups[bucket.layerId].add(mergedMesh);
          }

          if (bucket.muscleRegion) {
            anatomy.muscleMeshesByRegion[bucket.muscleRegion].push(mergedMesh);
          }
        }

        onProgressRender(i + 1, GLB_FILES_IN_LOAD_ORDER.length);
        await new Promise((r) => setTimeout(r, 15));
      } catch (err) {
        console.warn(`[Z-Anatomy Loader] Could not load ${fileName}:`, err);
      }
    }

    dracoLoader.dispose();
  } catch (err) {
    console.warn('[Z-Anatomy Loader] Fallback to procedural anatomy:', err);
  }
}
